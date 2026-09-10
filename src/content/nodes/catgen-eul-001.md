---
id: "CATGEN-EUL-001"
title: "Euler pairing"
shortTitle: "Euler pairing"
type: "definition"
status: "in-progress"
summary: "The alternating sum of dimensions of Ext groups, when these dimensions and the sum are finite."
authors: []
project: "CATGEN"
tags: ["categorical invariants","derived categories"]
references: [{"title":"Research outline supplied by Alex Gomez","note":"Beta seed content; editorial descriptions are not an independent proof review."}]
dependsOn: []
relations: [{"target":"CATGEN-NUM-001","type":"related-to"}]
verification: {"method":"human","note":"Human-authored research outline, with editorial exposition added for the beta. This entry has not received an independent mathematical review."}
provenance: "background"
---

## Definition

For objects $E,F$ in a $k$-linear category with finite-dimensional Ext groups and only finitely many nonzero degrees, define

$$\chi(E,F)=\sum_i(-1)^i\dim_k\operatorname{Ext}^i(E,F).$$

In the usual triangulated setting, additivity yields a bilinear pairing on the Grothendieck group.

## Why it matters

The pairing turns homological information into bilinear algebra and gives a common language for examples.
