import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizedRelations,
  validateNetwork,
  type Relatable,
} from "../src/lib/relations.ts";
const node = (
  id: string,
  dependsOn: string[] = [],
  relations: Relatable["relations"] = [],
): Relatable => ({ id, dependsOn, relations });
test("dependency aliases collapse without removing distinct semantic relations", () => {
  assert.deepEqual(
    normalizedRelations(
      node(
        "A-001",
        ["B-001"],
        [
          { target: "B-001", type: "depends-on" },
          { target: "B-001", type: "motivates" },
        ],
      ),
    ).map((e) => e.type),
    ["depends-on", "motivates"],
  );
});
test("missing IDs and duplicate permanent IDs fail validation", () => {
  assert.throws(() => validateNetwork([node("A-001", ["B-001"])]), /unknown/);
  assert.throws(
    () => validateNetwork([node("A-001"), node("A-001")]),
    /Duplicate/,
  );
});
test("cycles in dependencies fail but reciprocal conceptual relations are allowed", () => {
  assert.throws(
    () =>
      validateNetwork([
        node("A-001", ["B-001"]),
        node("B-001", [], [{ target: "A-001", type: "depends-on" }]),
      ]),
    /Circular/,
  );
  assert.doesNotThrow(() =>
    validateNetwork([
      node("A-001", [], [{ target: "B-001", type: "related-to" }]),
      node("B-001", [], [{ target: "A-001", type: "related-to" }]),
    ]),
  );
});
test("self relations fail validation", () =>
  assert.throws(
    () => validateNetwork([node("A-001", ["A-001"])]),
    /self relation/,
  ));
