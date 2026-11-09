# Research, Analysis & Deployment Docs

This folder contains all technical research, package analysis, and deployment documentation for echo-timemap. It follows a three-stage pipeline for integrating new packages and features.

---

## The Pipeline

Every new package or major feature goes through three stages:

1. **Research** -- Evaluate the package using [HOW_TO_RESEARCH_PACKAGES.md](./HOW_TO_RESEARCH_PACKAGES.md) and write the analysis using [RESEARCH_TEMPLATE.md](./RESEARCH_TEMPLATE.md).
2. **Analysis** -- Document the decision: why this package, how it fits the stack, pros/cons, alternatives considered. Named `{feature}-analysis.md`.
3. **Deployment** -- Track integration, configuration, known issues, and troubleshooting. Named `{feature}-deployment.md`.

Not every feature needs all three stages. Some only need a deployment doc (e.g., Docker setup). But any new third-party library **must** have at least an analysis doc.

---

## Documents in This Folder

### Research Guides
| File | Purpose |
|------|---------|
| [HOW_TO_RESEARCH_PACKAGES.md](./HOW_TO_RESEARCH_PACKAGES.md) | Step-by-step process for evaluating packages |
| [RESEARCH_TEMPLATE.md](./RESEARCH_TEMPLATE.md) | 15-section template for analysis docs |

### Analysis Docs
| File | Feature | Recommendation |
|------|---------|----------------|

<!--
  Add rows as you create analysis docs. Format:
  | [package-analysis.md](./package-analysis.md) | What it does | ✅ YES / ❌ NO / ⚠️ CONDITIONAL |
-->

### Deployment Docs
| File | Feature | Status |
|------|---------|--------|
| [timemap-frontend-deployment.md](./timemap-frontend-deployment.md) | Map component in the React frontend, data loading from the API, self-hosted fonts, server steps | In progress (stack verified 2026-11-05) |
| [timemap-api-deployment.md](./timemap-api-deployment.md) | PostgreSQL tables, seed data and provenance, public read API, operations | In progress (verified on PostgreSQL 16, 2026-11-05) |

<!--
  Add rows as you create deployment docs. Format:
  | [feature-deployment.md](./feature-deployment.md) | Brief description | Deployed YYYY-MM-DD / In progress |
-->

### Prototype Reference
| File | Content |
|------|---------|
| [wcag-audit-5d-timemap.md](./wcag-audit-5d-timemap.md) | WCAG 2.2 AA audit of the earlier `5d-timemap-a11y.jsx` build (2026-06-08) |
| [prototype-handoff-DEPLOYMENT.md](./prototype-handoff-DEPLOYMENT.md) | Data team's handoff notes for the single-file `5d-timemap-v2.html` (2026-11-02) |

---

## Adding New Docs

- **New package?** Follow [HOW_TO_RESEARCH_PACKAGES.md](./HOW_TO_RESEARCH_PACKAGES.md) -> create `{package}-analysis.md` using [RESEARCH_TEMPLATE.md](./RESEARCH_TEMPLATE.md)
- **Deploying a feature?** Create `{feature}-deployment.md` with setup steps, configuration, and troubleshooting
- **Update RESEARCH.md** when adding new docs -- keep the tables current

---

## Quick Links

- [Project README](../../README.md) -- Tech stack, structure, architecture
- [PROGRESS.md](../PROGRESS.md) -- What's built, what's next
- [TODO.md](../TODO.md) -- Pending tasks

---

**Last Updated:** 2026-11-05
