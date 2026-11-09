# WCAG 2.2 Accessibility Audit Report

**Content audited:** `5d-timemap.jsx` — a React + Three.js "5D TimeMap", an interactive 3D map of ~402 UNESCO World Heritage sites with a time-sweep timeline, layer filters, search, and a detail panel.
**Conformance level:** Level AA (includes all Level A criteria)
**Audit date:** 2026-06-08
**Remediated file:** `5d-timemap-a11y.jsx`

---

## Summary

| Verdict | Count |
|---------|-------|
| ✅ PASS (after remediation) | 27 |
| ❌ FAIL (remaining) | 0 |
| ⚠️ PARTIAL (remaining) | 3 |
| — N/A | 20 |
| **Total applicable** | 30 |

**Overall conformance:** The original component **did not conform** to WCAG 2.2 Level AA. After the changes applied to `5d-timemap-a11y.jsx`, it **substantially conforms**, with three residual PARTIAL items tied to the inherent limits of a WebGL canvas (these are mitigated by the new text-equivalent data table rather than fully resolved inside the 3D scene).

The most critical original problems were that the entire experience was pointer-only (no keyboard path to orbit, scrub time, or select a site), form fields had no programmatic labels, custom controls exposed no name/role/state to assistive technology, and large bands of secondary text fell below the 4.5:1 contrast minimum.

---

## What changed, at a glance

- A visually-hidden, screen-reader-and-keyboard-reachable **data table** now mirrors every filtered site (name, country, layer, period, active span) and every institution. Each row name is a button that opens the detail panel. This is the text alternative to the 3D scene and the keyboard route to "select a pin". It reveals itself visibly on keyboard focus.
- The **3D canvas** is now a focusable `role="application"` with an `aria-label` describing the controls; **arrow keys orbit, Shift+arrows pan, +/- zoom**.
- The **timeline** is now a real `role="slider"` (Arrow/Page/Home/End keys), no longer drag-only.
- Every control (search, country, layer toggles, All/None, institutions toggle, play/pause, spotlight, era jumps, close) now has a programmatic **name, role and pressed/expanded state**.
- A polite **aria-live region** announces the active-site count as the sweep year changes.
- **Focus is visible** everywhere (the global `outline:none` was removed and a `:focus-visible` ring added).
- **Contrast** of muted greys raised to ≥4.5:1; toggle state no longer relies on colour alone (filled vs. hollow markers, bold active era, `aria-pressed`).
- Interactive **targets** padded to ≥24px.

---

## Principle 1: Perceivable

### 1.1.1 Non-text Content (A) — ✅ PASS *(was ❌ FAIL)*
**What it requires:** All non-text content has an equivalent text alternative.
**Original finding:** The whole 3D WebGL scene conveyed all data visually with no text equivalent. Icon-only controls (play `▶`, pause `❚❚`, close `×`) and emoji layer glyphs had no accessible names.
**Fix applied:** Added the hidden `<table>` text alternative for sites and institutions; gave the canvas an `aria-label`; added `aria-label` to play/pause and close; wrapped purely decorative glyphs/emoji in `aria-hidden="true"` so their names come from the button label, not the glyph.

### 1.3.1 Info and Relationships (A) — ✅ PASS *(was ❌ FAIL)*
**Original finding:** "Search" and "Country" were styled `<div>`s, not associated with their `<input>`/`<select>`. The layer filter was an unlabelled cluster of buttons.
**Fix applied:** Real `<label htmlFor>` tied to `id`s on the search and country controls; the layer group is now `role="group"` with `aria-labelledby` pointing at its heading; the data alternative uses proper `<table>` semantics with `<th scope>`.

### 1.3.2 Meaningful Sequence (A) — ✅ PASS
DOM order (header → filters → map/alternative → timeline → details) is logical and matches the visual reading order.

### 1.3.4 Orientation (AA) — ✅ PASS
No orientation lock. (Layout is dense on small screens — see 1.4.10.)

### 1.3.5 Identify Input Purpose (AA) — — N/A
No fields collecting personal user data (search/country filter only).

### 1.4.1 Use of Color (A) — ✅ PASS *(was ❌ FAIL)*
**Original finding:** Layer on/off and active-era state were signalled by colour alone (a coloured vs. grey dot; orange vs. grey text).
**Fix applied:** Layer/institution markers are now **filled when on, hollow-outlined when off**; the active era is also **bold**; all toggles expose `aria-pressed`. State no longer depends on hue.

### 1.4.3 Contrast (Minimum) (AA) — ✅ PASS *(was ❌ FAIL)*
**Original finding:** `#5a6478` on `#070a12` ≈ **3.3:1**; `#454f63`, `#3f4860`, `#6a7488` were lower still — used for sub-labels, axis ticks, the "older is taller" note, era labels and the controls hint, all below the 4.5:1 minimum for normal text.
**Fix applied:** These tokens were raised to `#9aa3b4` (~7:1) and `#8a93a5` (~6:1). Body text (`#e8ecf2`, `#c2cad8`) and `#7a8498` (~5.2:1) already passed.
*Note: contrast is computed mechanically from the colour values; verify final rendering once in the host page.*

### 1.4.4 Resize Text (AA) — ⚠️ PARTIAL
Text uses px sizing; it will scale with browser/page zoom but not with text-only zoom. The layout is flex-based and tolerates zoom reasonably. Recommendation: move font sizes to `rem` if you need guaranteed 200% text-only resize.

### 1.4.5 Images of Text (AA) — ✅ PASS
Site/era/axis labels are live text. The only rasterised text is the inset-tile labels drawn into the WebGL scene (overseas-territory names), which are now also present as live text in the data table.

### 1.4.10 Reflow (AA) — ⚠️ PARTIAL
The three fixed side panels (222px filters, 312px details) plus the canvas can require two-dimensional scrolling at 320 CSS px width. Recommendation: collapse the side panels into stacked/drawer layouts under a narrow breakpoint. (Not blocking on desktop; flagged for mobile.)

### 1.4.11 Non-text Contrast (AA) — ✅ PASS *(was ⚠️ PARTIAL)*
**Original finding:** Input/select borders at `rgba(255,255,255,0.09)` were under 3:1 against the background.
**Fix applied:** Raised the form-control border to `rgba(255,255,255,0.32)`; focus ring is `#6ec6ff` (well above 3:1). Toggle buttons also carry text + marker, not boundary alone.

### 1.4.12 Text Spacing (AA) — ✅ PASS
No content is clipped by a fixed line-height/height that would break under user text-spacing overrides; text containers grow with content.

### 1.4.13 Content on Hover or Focus (AA) — ✅ PASS *(was ⚠️ PARTIAL)*
**Original finding:** The map hover tooltip was pointer-triggered, not dismissible/persistent, and could overlap content.
**Fix applied:** The tooltip is a non-essential visual duplicate, now `aria-hidden` and repositioned to the opposite corner from the (focus-revealed) data table; the same information is available, persistently, in the detail panel and table.

---

## Principle 2: Operable

### 2.1.1 Keyboard (A) — ✅ PASS *(was ❌ FAIL)*
**Original finding:** Orbiting, panning, zooming, scrubbing the timeline, and selecting a pin were all pointer-only.
**Fix applied:** Canvas is focusable with arrow/Shift-arrow/+/- key handling; the timeline is a keyboard slider; pins are selectable from the keyboard-reachable data table. All other controls are native buttons/inputs.

### 2.1.2 No Keyboard Trap (A) — ✅ PASS
All new interactive elements are standard focusable elements; focus can always move away with Tab/Shift+Tab.

### 2.1.4 Character Key Shortcuts (A) — ✅ PASS
The `+`/`-` zoom keys only act while the canvas itself holds focus, so they do not hijack typing elsewhere.

### 2.2.1 Timing Adjustable (A) — ✅ PASS
No imposed time limits.

### 2.2.2 Pause, Stop, Hide (A) — ✅ PASS
The time sweep is **opt-in** (starts paused) and has an accessible Play/Pause control with `aria-pressed`.

### 2.3.1 Three Flashes (A) — ✅ PASS
Animations are smooth eases/rotations; nothing flashes more than three times per second.

### 2.4.1 Bypass Blocks (A) — — N/A
Single-view component, not a multi-page site with repeated blocks.

### 2.4.2 Page Titled (A) — — N/A
Component-level; the host page is responsible for `<title>`.

### 2.4.3 Focus Order (A) — ✅ PASS
Tab order follows the logical DOM sequence; the data table sits with the map it describes.

### 2.4.4 Link Purpose (In Context) (A) — ✅ PASS
The external links ("UNESCO listing", "Official site", "Visit website") sit inside a region labelled with the selected site's name, so their purpose is clear in context.

### 2.4.6 Headings and Labels (AA) — ✅ PASS
`<h1>` title, `<h2>` for the detail panel and the sites table caption/heading; all controls now have descriptive labels.

### 2.4.7 Focus Visible (AA) — ✅ PASS *(was ❌ FAIL)*
**Original finding:** `outline:"none"` on inputs/select and no focus styling on custom buttons.
**Fix applied:** Removed `outline:none`; added a global `:focus-visible` ring (2px `#6ec6ff`, 2px offset).

### 2.4.11 Focus Appearance (AA) 🆕 — ✅ PASS *(was ❌ FAIL)*
The focus indicator fully encloses each control, is ≥2px thick, and `#6ec6ff` against the dark background far exceeds the 3:1 change-of-state contrast.

### 2.5.1 Pointer Gestures (A) — ✅ PASS
No multipoint/path gestures are required; all camera moves have single-key/single-pointer equivalents.

### 2.5.2 Pointer Cancellation (A) — ✅ PASS
Selection fires on a discrete click/keypress, not on down-event in a way that can't be aborted by moving off.

### 2.5.3 Label in Name (A) — ✅ PASS
Visible button text matches each accessible name; icon-only buttons use matching `aria-label`s.

### 2.5.4 Motion Actuation (A) — — N/A
No device-motion actuation.

### 2.5.7 Dragging Movements (AA) 🆕 — ✅ PASS *(was ❌ FAIL)*
**Original finding:** Orbit, pan, and timeline scrub all required dragging.
**Fix applied:** Keyboard equivalents for camera (arrows/Shift-arrows/±) and timeline (slider keys); the timeline can also be set with a single click anywhere on its track.

### 2.5.8 Target Size (Minimum) (AA) 🆕 — ✅ PASS *(was ❌ FAIL)*
**Original finding:** All/None buttons (4px padding), era pills, layer rows, and the close `×` were under 24×24px.
**Fix applied:** Layer rows `minHeight:26`, All/None `minHeight:28`, era pills `minHeight:26`, institutions toggle `minHeight:30`, close button `minWidth/Height:28`. The timeline target is 46px tall.

---

## Principle 3: Understandable

### 3.1.1 Language of Page (A) — ✅ PASS *(host-dependent)*
Added `lang="en"` on the component root as a safeguard; the host `<html lang>` remains authoritative.

### 3.1.2 Language of Parts (AA) — ✅ PASS
Content is English; site names in other languages are proper nouns (exempt).

### 3.2.1 On Focus (A) — ✅ PASS
Focusing a control never triggers an automatic context change.

### 3.2.2 On Input (A) — ✅ PASS
Changing search/country/filters updates the same view predictably; no navigation or new window on input.

### 3.2.3 / 3.2.4 Consistent Navigation / Identification (AA) — — N/A
Single view; no repeated cross-page navigation.

### 3.2.6 Consistent Help (A) 🆕 — — N/A
No help mechanism present.

### 3.3.1 Error Identification (A) — — N/A
No form submission or validatable input (free-text filter only).

### 3.3.2 Labels or Instructions (A) — ✅ PASS *(was ❌ FAIL)*
Search and country now have explicit labels; the canvas `aria-label` and slider labels state how to operate them.

### 3.3.3 / 3.3.4 Error Suggestion / Prevention (AA) — — N/A
No errors, commitments, or data submission.

### 3.3.7 Redundant Entry (A) 🆕 — — N/A
No multi-step entry.

### 3.3.8 Accessible Authentication (AA) 🆕 — — N/A
No authentication.

---

## Principle 4: Robust

### 4.1.2 Name, Role, Value (A) — ✅ PASS *(was ❌ FAIL)*
**Original finding:** Custom toggle buttons exposed no pressed state; the seek bar and canvas had no role/value; inputs had no names.
**Fix applied:** `aria-pressed` on layer, institutions, play, spotlight and era toggles; `role="slider"` with `aria-valuemin/max/now/text` on the timeline; `role="application"` + label on the canvas; labels on inputs.

### 4.1.3 Status Messages (AA) — ✅ PASS *(was ❌ FAIL)*
**Original finding:** The active-site count and sweep year updated silently.
**Fix applied:** A visually-hidden `aria-live="polite"` region announces "N of M shown sites active in {year}" as it changes.

---

## 🛠️ Prioritised Remediation Plan

### Critical (Level A) — done
1. Keyboard operability of the map, timeline and pin selection — resolved via canvas keys, slider role, and the keyboard-reachable data table.
2. Programmatic labels and name/role/value for all controls — resolved.
3. Text alternative for the 3D scene — resolved via the hidden data table.

### Important (Level AA) — done
4. Contrast ≥4.5:1, visible focus, focus appearance, target size, dragging alternatives, status messages — resolved.

### Recommended (residual PARTIAL)
5. **Reflow / small-screen (1.4.10):** collapse the 222px and 312px panels into drawers under a narrow breakpoint so nothing needs 2-axis scrolling at 320px.
6. **Text-only resize (1.4.4):** migrate px font sizes to `rem` for guaranteed 200% text scaling.
7. **Deeper canvas semantics:** the data table is the equivalent; if you later want focusable in-scene pins, expose each pin via an offscreen focus proxy that drives the camera. Optional, beyond AA.

---

## Verification notes

- The remediated file was parsed and bundled with esbuild (JSX loader, React/Three external) with **no syntax errors**.
- Contrast figures are **computed from colour values**, not measured on-screen; confirm once mounted in the host page and theme.
- Screen-reader behaviour (NVDA/VoiceOver) and full keyboard walkthroughs are **manual checks** worth running before release; the structure now supports them.
