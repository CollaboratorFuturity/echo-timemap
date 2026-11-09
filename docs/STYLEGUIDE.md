# echo-timemap -- Style Guide & Cheatsheet

Use this to replicate the project's visual language across all UI work.

The visual language is defined by the `THEMES` object (`dark`, `light`) at the top of `frontend/src/features/timemap/TimeMap.jsx`. Styling is inline React `style` props plus one scoped `<style>` block in the component; there is no UI framework. Theme choice persists in `localStorage` key `tm-theme`.

---

## Color Palette

### Primary
| Token       | Hex       | Use                              |
|-------------|-----------|----------------------------------|
| primary.50  | `#{{HEX}}` | Light backgrounds, hover states  |
| primary.100 | `#{{HEX}}` | Subtle highlights                |
| primary.200 | `#{{HEX}}` | Borders, dividers                |
| primary.300 | `#{{HEX}}` | Secondary buttons                |
| primary.400 | `#{{HEX}}` | Links, active states             |
| primary.500 | `#{{HEX}}` | **Primary buttons, key actions** |
| primary.600 | `#{{HEX}}` | Dark accents, active nav         |
| primary.700 | `#{{HEX}}` | Dark accents                     |
| primary.800 | `#{{HEX}}` | Very dark accents                |
| primary.900 | `#{{HEX}}` | Near-black                       |

### Accent
| Token       | Hex       | Use                              |
|-------------|-----------|----------------------------------|
| accent.50   | `#{{HEX}}` | Light highlight background       |
| accent.300  | `#{{HEX}}` | Badges, tags                     |
| accent.500  | `#{{HEX}}` | **Accent actions, highlights**   |
| accent.700  | `#{{HEX}}` | Dark accent text                 |

<!--
  Add more color groups as needed:
  - Brand-specific (e.g., EU blue/yellow, client brand)
  - Semantic (success green, error red, warning amber)
  - Grays (page bg, card borders, muted text, headings)
-->

### Prototype theme tokens (current, from `THEMES`)
| Token    | Dark       | Light      | Use                                  |
|----------|------------|------------|--------------------------------------|
| bg       | `#070a12`  | `#eef1f6`  | Page and 3D scene background         |
| text     | `#e8ecf2`  | `#19212e`  | Primary text                         |
| body     | `#c2cad8`  | `#2c3645`  | Body text                            |
| muted    | `#9aa3b4`  | `#4a5568`  | Sub-labels (raised to ≥4.5:1 in audit) |
| accent   | `#6ec6ff`  | `#0c63b8`  | Focus ring, links, active states     |
| hot      | `#FF6B3D`  | `#b3400f`  | Active era, play button gradient start |
| danger   | `#E84855`  | `#b01c28`  | Errors                               |

### Grays
| Usage                | Token        |
|----------------------|--------------|
| Page background      | `gray.50`    |
| Card borders         | `gray.200`   |
| Muted text           | `gray.400`   |
| Secondary text       | `gray.500`   |
| Body text            | `gray.600`   |
| Headings             | `gray.700`   |

---

## Typography

**Font stack:**
```
"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
```

Headings and the title use `"Playfair Display"` (500, 700). Body uses DM Sans (300-700). Both self-hosted via Fontsource; never load fonts from a third-party CDN.

| Element              | Size    | Weight     | Color       |
|----------------------|---------|------------|-------------|
| Page heading (h1)    | `2xl`   | `bold`     | gray.700    |
| Section heading (h2) | `lg`    | `bold`     | gray.700    |
| Card heading (h3)    | `md`    | `semibold` | gray.700    |
| Body text            | `sm`    | `normal`   | gray.600    |
| Muted / helper text  | `xs`    | `normal`   | gray.500    |

<!--
  Adjust sizes and weights to match your UI framework's scale.
  These examples use Chakra UI sizing tokens. Adapt for Tailwind, MUI, etc.
-->

---

## Spacing & Layout

| Concept              | Value   | Notes                          |
|----------------------|---------|--------------------------------|
| Page padding         | `24px`  | inline styles `padding: 24`      |
| Card padding         | `20px`  | inline styles `padding: 20`      |
| Gap between cards    | `16px`  | inline styles `gap: 16`    |
| Gap between sections | `24px`  | inline styles `gap: 24`    |
| Border radius (cards)| `lg`    | ~8px                           |

<!--
  Add layout constants relevant to your project:
  - Sidebar width (expanded/collapsed)
  - Top nav height
  - Max content width
  - Border radius for pills/tags
-->

| Layout constant      | Value   | Notes                          |
|----------------------|---------|--------------------------------|
| Filters panel width  | `222px` | Fixed (see Reflow TODO)        |
| Detail panel width   | `312px` | Fixed (see Reflow TODO)        |
| Timeline target      | `46px` tall | Click anywhere on the track |
| Minimum target size  | `24px`  | WCAG 2.5.8                     |

---

## Component Patterns

<!--
  Document the reusable component patterns for your project.
  Use actual code snippets from your UI framework.

  Examples for Chakra UI:

  ### Cards
  ```jsx
  <Box bg="white" p="5" borderRadius="lg" shadow="sm" border="1px solid" borderColor="gray.200">
    <Heading size="md" mb="3">Title</Heading>
    <Text color="gray.500" fontSize="sm">Content</Text>
  </Box>
  ```

  ### Primary Button
  ```jsx
  <Button colorPalette="blue" size="lg">Action</Button>
  ```

  ### Form Field
  ```jsx
  <Box>
    <Text fontSize="sm" fontWeight="medium" mb="1">Label</Text>
    <Input size="lg" placeholder="..." />
  </Box>
  ```
-->

---

## Page Backgrounds

| Context              | Background  |
|----------------------|-------------|
| Auth pages           | `gray.50`   |
| Main content area    | `gray.50`   |
| Cards / panels       | `white`     |

<!--
  Add context-specific backgrounds:
  - Sidebar, top nav, footer
  - Hero sections, gradients
  - Dark mode variants
-->

---

## Borders & Shadows

| Element              | Border                         | Shadow   |
|----------------------|--------------------------------|----------|
| Cards                | `1px solid gray.200`           | `sm`     |
| Modals               | none                           | `2xl`    |
| Top nav              | bottom `1px solid gray.200`    | none     |

---

## Responsive Breakpoints

| Breakpoint | Width    | What changes                                   |
|------------|----------|------------------------------------------------|
| base       | 0px+     | Single column, compact nav                     |
| md         | 768px+   | Wider cards, more info visible                 |
| lg         | 1024px+  | Full layout, sidebar visible                   |

---

## Accessibility Checklist

- Skip-to-content link
- Semantic landmarks: `<aside>`, `<header>`, `<main>`, `<footer>`
- All interactive elements keyboard-accessible
- Color contrast: minimum 4.5:1 ratio
- `aria-label` on icon-only buttons
- Focus visible on all interactive elements

<!--
  Add project-specific accessibility requirements:
  - Language attribute updates (for i18n)
  - Screen reader testing approach
  - WCAG compliance level target
-->

- Target: WCAG 2.2 AA (public Creative Europe deliverable D5.6)
- The 3D scene has a screen-reader and keyboard-reachable data table as its text alternative; every new data source must appear in it
- Canvas keys: arrows orbit, Shift+arrows pan, +/- zoom (only while the canvas has focus)
- Toggle state never relies on color alone (filled vs hollow markers, `aria-pressed`)
- Loading and error screens (`TimeMapPage.tsx`) use `role="status"` and `role="alert"` and the same dark/light background as the map
- Audit reference: [wcag-audit-5d-timemap.md](research/wcag-audit-5d-timemap.md)

---

## Quick Reference: Framework Usage

<!--
  If you use multiple styling approaches, document the division of labor.
  Example for Chakra + Tailwind:

  | Use Chakra for...              | Use Tailwind for...          |
  |--------------------------------|------------------------------|
  | Buttons, Inputs, Modals        | Page-level flex/grid layout  |
  | Cards (Box with props)         | Responsive hiding            |
  | Typography (Heading, Text)     | Quick spacing utilities      |
  | Theme tokens (colors, fonts)   | One-off utility classes       |

  Rule of thumb: If it's a **component**, use Chakra. If it's **layout glue**, either works.
-->

New UI reads colors from the active theme object (`T`) rather than hard-coded hex values, so dark and light stay in step.
