---
id: "CATGEN-NUM-001"
title: "Numerical Grothendieck group"
shortTitle: "Numerical K-group"
type: "concept"
editorialState: "reviewed"
publicationStatus: "unpublished"
summary: "A quotient of the Grothendieck group that removes classes invisible to Euler pairings."
authors: []
projects: ["CATGEN"]
tags: ["categorical invariants","derived categories"]
references: [{"title":"Research outline supplied by Alex Gomez","note":"Beta seed content; editorial descriptions are not an independent proof review."}]
dependsOn: ["CATGEN-EUL-001"]
relations: [{"target":"CATGEN-001","type":"related-to"}]
verification: {"method":"human","note":"Human-authored research outline, with editorial exposition added for the beta. This entry has not received an independent mathematical review."}
provenance: "background"
---

## Description

The Grothendieck group $K_0(\mathcal D)$ imposes $[B]=[A]+[C]$ for each distinguished triangle $A\to B\to C\to A[1]$. Numerical equivalence uses a radical of the Euler pairing. Left and right radical conventions must be specified; in settings where they agree, one writes $K_{\mathrm{num}}(\mathcal D)=K_0(\mathcal D)/\operatorname{rad}\chi$.

## Why it matters

A numerical quotient separates the finite bilinear data relevant to an invariant from the full complexity of the category.
