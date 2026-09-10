import cytoscape, { type Core, type StylesheetJson } from "cytoscape";
import type { GraphData } from "../lib/graph";
import { projects, statusLabels, statusSymbols } from "../lib/model";

const styles: StylesheetJson = [
  {
    selector: "node",
    style: {
      "background-color": "#586d88",
      "border-color": "#314862",
      "border-width": 1.5,
      width: 23,
      height: 23,
      label: "data(label)",
      color: "#21344d",
      "font-family": "Georgia, serif",
      "font-size": 16,
      "text-valign": "bottom",
      "text-margin-y": 9,
      "text-wrap": "wrap",
      "text-max-width": "150px",
      "text-background-color": "#f8f9fb",
      "text-background-opacity": 0.9,
      "text-background-padding": "3px",
      "overlay-opacity": 0,
    },
  },
  {
    selector: 'node[project = "CATGEN"]',
    style: { "background-color": "#87879a", "border-color": "#5d5d75" },
  },
  {
    selector: 'node[project = "HMS"]',
    style: { "background-color": "#78968d", "border-color": "#4a6b60" },
  },
  { selector: 'node[type = "definition"]', style: { "border-width": 3 } },
  {
    selector:
      'node[type = "theorem"], node[type = "lemma"], node[type = "proposition"], node[type = "corollary"]',
    style: {
      shape: "round-rectangle",
      width: 36,
      height: 25,
      "background-color": "#1d3955",
    },
  },
  {
    selector: 'node[type = "example"]',
    style: { shape: "diamond", width: 33, height: 33 },
  },
  {
    selector: 'node[type = "construction"]',
    style: { shape: "round-rectangle", width: 28, height: 25 },
  },
  {
    selector: 'node[type = "computation"]',
    style: { shape: "rectangle", width: 28, height: 24, "border-width": 3 },
  },
  {
    selector: 'node[type = "paper"]',
    style: { shape: "rectangle", width: 23, height: 30 },
  },
  {
    selector: 'node[type = "project"]',
    style: {
      shape: "hexagon",
      width: 47,
      height: 47,
      "font-size": 20,
      "font-weight": "bold",
    },
  },
  {
    selector: 'node[type = "open-problem"], node[type = "conjecture"]',
    style: {
      shape: "diamond",
      "background-opacity": 0,
      width: 32,
      height: 32,
      "border-width": 2.5,
    },
  },
  {
    selector:
      'node[status = "in-progress"], node[status = "open"], node[status = "conjectural"]',
    style: { "border-style": "dashed" },
  },
  {
    selector: 'node[status = "abandoned"]',
    style: { "background-opacity": 0.2, "border-style": "dotted" },
  },
  {
    selector: "edge",
    style: {
      width: 1,
      "line-color": "#b4becb",
      "target-arrow-color": "#a1aebf",
      "target-arrow-shape": "triangle",
      "arrow-scale": 0.65,
      "curve-style": "bezier",
      "control-point-step-size": 30,
      opacity: 0.64,
      "overlay-opacity": 0,
    },
  },
  {
    selector: 'edge[type = "motivates"]',
    style: { "line-style": "dashed", "line-color": "#778c9c" },
  },
  { selector: ".faded", style: { opacity: 0.12 } },
  {
    selector: "node.focus",
    style: {
      "border-color": "#142c46",
      "border-width": 4,
      "background-color": "#213c5b",
      "text-outline-color": "#f8f9fb",
      "text-outline-width": 2,
      "z-index": 10,
    },
  },
  {
    selector: "edge.neighbor, edge.hovered, edge:selected",
    style: {
      width: 1.8,
      opacity: 1,
      "line-color": "#536f8b",
      "target-arrow-color": "#536f8b",
      label: "data(type)",
      "font-size": 10,
      color: "#21344d",
      "text-rotation": "autorotate",
      "text-background-color": "#f8f9fb",
      "text-background-opacity": 1,
      "text-background-padding": "3px",
    },
  },
  { selector: ".hidden", style: { display: "none" } },
  { selector: "node.no-label", style: { label: "" } },
];

class ResearchGraph extends HTMLElement {
  cy?: Core;
  observer?: ResizeObserver;
  connectedCallback() {
    if (this.cy) return;
    const data = JSON.parse(
      this.querySelector("[data-graph-data]")!.textContent!,
    ) as GraphData;
    const compact = this.dataset.compact === "true";
    const canvas = this.querySelector<HTMLElement>("[data-canvas]")!;
    const byId = new Map(data.nodes.map((n) => [n.id, n]));
    const groups = Object.keys(projects);
    const positions = new Map<string, { x: number; y: number }>();
    if (compact) {
      const center = this.dataset.selected;
      const rest = data.nodes.filter((n) => n.id !== center);
      rest.forEach((n, i) => {
        const angle = (i / rest.length) * Math.PI * 2;
        positions.set(n.id, {
          x: 260 + 215 * Math.cos(angle),
          y: 210 + 165 * Math.sin(angle),
        });
      });
      if (center) positions.set(center, { x: 260, y: 210 });
    } else {
      // Stable, metadata-derived clusters. No separate hand-authored graph dataset.
      groups.forEach((project, group) => {
        const members = data.nodes.filter((n) => n.project === project);
        const hubs = members.filter((n) => n.type === "project");
        const rest = members.filter((n) => n.type !== "project");
        const centers = [
          { x: 260, y: 300 },
          { x: 810, y: 230 },
          { x: 1330, y: 310 },
        ];
        const c = centers[group];
        hubs.forEach((n, i) =>
          positions.set(n.id, { x: c.x + i * 65, y: c.y }),
        );
        rest.forEach((n, i) => {
          const a = (i / rest.length) * Math.PI * 2 - Math.PI / 2;
          const r = project === "X10" ? 235 : 200;
          positions.set(n.id, {
            x: c.x + Math.cos(a) * r,
            y: c.y + Math.sin(a) * r * 0.85,
          });
        });
      });
    }
    const cy = (this.cy = cytoscape({
      container: canvas,
      elements: [
        ...data.nodes.map((n) => ({
          data: { ...n, label: n.shortTitle },
          position: positions.get(n.id),
        })),
        ...data.edges.map((e) => ({ data: e })),
      ],
      style: styles,
      layout: { name: "preset", padding: compact ? 35 : 60 },
      minZoom: 0.15,
      maxZoom: 3,
      boxSelectionEnabled: false,
      autounselectify: false,
    }));
    const message = this.querySelector<HTMLElement>("[data-message]")!;
    const panel = this.querySelector<HTMLElement>("[data-panel]");
    let selected: string | undefined;
    let lastTrigger: HTMLElement | null = null;
    const text = (selector: string, value: string) => {
      const el = this.querySelector(selector);
      if (el) el.textContent = value;
    };
    const clear = (restoreFocus = false) => {
      selected = undefined;
      cy.elements().removeClass("focus faded neighbor");
      cy.elements().unselect();
      if (panel) panel.hidden = true;
      message.textContent = "";
      if (restoreFocus) lastTrigger?.focus();
    };
    const select = (id: string, keyboard = false) => {
      const node = byId.get(id);
      if (!node) return;
      const el = cy.getElementById(id);
      if (el.hasClass("hidden")) return;
      if (compact) {
        window.location.href = node.href;
        return;
      }
      selected = id;
      cy.elements().removeClass("focus faded neighbor");
      cy.elements().addClass("faded");
      el.closedNeighborhood().removeClass("faded");
      el.addClass("focus");
      el.connectedEdges().addClass("neighbor");
      text("[data-panel-id]", node.id);
      text("[data-panel-title]", node.title);
      text("[data-panel-type]", node.type.replaceAll("-", " "));
      const badge = this.querySelector<HTMLElement>("[data-panel-status]")!;
      badge.className = `status status-${node.status}`;
      badge.textContent = `${statusSymbols[node.status]} ${statusLabels[node.status]}`;
      text("[data-panel-summary]", node.summary);
      text("[data-panel-project]", projects[node.project].title);
      text(
        "[data-panel-provenance]",
        `${node.provenance.replaceAll("-", " ")} · ${node.verification.note}`,
      );
      const link = this.querySelector<HTMLAnchorElement>("[data-panel-link]")!;
      link.href = node.href;
      const list = this.querySelector("[data-panel-relations]")!;
      list.replaceChildren();
      for (const edge of data.edges.filter(
        (e) => e.source === id || e.target === id,
      )) {
        const outgoing = edge.source === id;
        const other = byId.get(outgoing ? edge.target : edge.source)!;
        const li = document.createElement("li");
        const label = document.createElement("span");
        label.textContent = outgoing ? `${edge.type} →` : `← ${edge.type} from`;
        const a = document.createElement("a");
        a.href = other.href;
        a.textContent = other.shortTitle;
        li.append(label, a);
        if (edge.note) {
          const note = document.createElement("small");
          note.textContent = edge.note;
          li.append(note);
        }
        list.append(li);
      }
      panel!.hidden = false;
      message.textContent = `Selected ${node.shortTitle}. ${el.neighborhood("node").length} immediate neighbors.`;
      if (keyboard)
        this.querySelector<HTMLElement>("[data-panel-title]")?.focus();
    };
    cy.on("tap", "node", (event) => select(event.target.id()));
    cy.on("tap", "edge", (event) => {
      const edge = event.target.data();
      message.textContent = `${byId.get(edge.source)?.shortTitle} — ${edge.type} → ${byId.get(edge.target)?.shortTitle}${edge.note ? `. ${edge.note}` : ""}`;
    });
    cy.on("tap", (event) => {
      if (event.target === cy) clear();
    });
    cy.on("mouseover", "node, edge", (event) => {
      canvas.style.cursor = "pointer";
      event.target.addClass("hovered");
    });
    cy.on("mouseout", "node, edge", (event) => {
      canvas.style.cursor = "grab";
      event.target.removeClass("hovered");
    });
    const fit = () => {
      const visible = cy.elements().not(".hidden");
      if (!visible.nodes().length) return;
      cy.fit(visible, compact ? 40 : 65);
      // A single search result should not become an oversized glyph.
      if (cy.zoom() > 1.2)
        cy.zoom({
          level: 1.2,
          renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 },
        });
    };
    this.querySelector("[data-fit]")?.addEventListener("click", fit);
    for (const [selector, factor] of [
      ["[data-zoom-in]", 1.25],
      ["[data-zoom-out]", 0.8],
    ] as const)
      this.querySelector(selector)?.addEventListener("click", () =>
        cy.zoom({
          level: cy.zoom() * factor,
          renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 },
        }),
      );
    this.querySelector("[data-close]")?.addEventListener("click", () =>
      clear(true),
    );
    this.addEventListener("keydown", (e) => {
      if (e.key === "Escape") clear(true);
    });
    this.querySelectorAll<HTMLButtonElement>("[data-select-node]").forEach(
      (b) =>
        b.addEventListener("click", () => {
          lastTrigger = b;
          select(b.dataset.selectNode!, true);
        }),
    );
    const search = this.querySelector<HTMLInputElement>("[data-search]");
    const type = this.querySelector<HTMLSelectElement>("[data-type]");
    const status = this.querySelector<HTMLSelectElement>("[data-status]");
    const project = this.querySelector<HTMLSelectElement>("[data-project]");
    const applyFilters = () => {
      clear();
      const query = search!.value.trim().toLocaleLowerCase();
      const matches = new Set(
        data.nodes
          .filter(
            (n) =>
              (!type!.value || n.type === type!.value) &&
              (!status!.value || n.status === status!.value) &&
              (!project!.value || n.project === project!.value) &&
              `${n.id} ${n.title} ${n.shortTitle} ${n.summary} ${n.tags.join(" ")}`
                .toLocaleLowerCase()
                .includes(query),
          )
          .map((n) => n.id),
      );
      cy.nodes().forEach((n) => {
        n.toggleClass("hidden", !matches.has(n.id()));
      });
      cy.edges().forEach((e) => {
        e.toggleClass(
          "hidden",
          !matches.has(e.source().id()) || !matches.has(e.target().id()),
        );
      });
      this.querySelectorAll<HTMLElement>("[data-object]").forEach(
        (li) => (li.hidden = !matches.has(li.dataset.object!)),
      );
      text("[data-count]", String(matches.size));
      message.textContent = matches.size
        ? `${matches.size} of ${data.nodes.length} objects shown`
        : "No objects match. Try another search or reset the filters.";
      fit();
    };
    search?.addEventListener("input", applyFilters);
    [type, status, project].forEach((s) =>
      s?.addEventListener("change", applyFilters),
    );
    const labels = this.querySelector<HTMLInputElement>("[data-labels]");
    labels?.addEventListener("change", () =>
      cy.nodes().toggleClass("no-label", !labels.checked),
    );
    this.querySelector("[data-reset]")?.addEventListener("click", () => {
      search!.value = "";
      type!.value = "";
      status!.value = "";
      project!.value = "";
      labels!.checked = true;
      cy.nodes().removeClass("no-label");
      cy.nodes().positions((n) => positions.get(n.id())!);
      applyFilters();
    });
    if (!compact) {
      const params = new URLSearchParams(location.search);
      if (params.has("project") && groups.includes(params.get("project")!)) {
        project!.value = params.get("project")!;
        applyFilters();
      }
      const initial = params.get("node");
      if (initial) select(initial);
    } else if (this.dataset.selected)
      cy.getElementById(this.dataset.selected).addClass("focus");
    this.observer = new ResizeObserver(() => {
      cy.resize();
      if (!selected) fit();
    });
    this.observer.observe(canvas);
    canvas.style.cursor = "grab";
  }
  disconnectedCallback() {
    this.observer?.disconnect();
    this.cy?.destroy();
    this.cy = undefined;
  }
}
customElements.define("research-graph", ResearchGraph);
