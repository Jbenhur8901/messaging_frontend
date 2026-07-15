---
name: Nodes Flow
description: WhatsApp automation cockpit for African B2B operators
colors:
  void: "#080808"
  surface: "#121212"
  surface-raised: "#1A1A1A"
  border: "#27272A"
  signal: "#FFCC00"
  signal-foreground: "#080808"
  ink: "#FFFFFF"
  ink-muted: "#A1A1AA"
  destructive: "#FF4545"
  warning: "#F59E0B"
  info: "#005BAA"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.1em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.signal-foreground}"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "#E6B800"
    textColor: "{colors.signal-foreground}"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
  button-outline:
    backgroundColor: "rgba(255,204,0,0.1)"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "rgba(255,255,255,0.8)"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
  input-default:
    backgroundColor: "{colors.void}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "8px 14px"
  card-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: Nodes Flow

## 1. Overview

**Creative North Star: "Mission Control"**

Nodes Flow is a cockpit, not a dashboard. Every surface is engineered for operators who process high-volume WhatsApp inboxes with speed and precision — not for first-time users who need reassurance. The near-void canvas (`#080808` body → `#121212` cards) is the darkness that makes signal legible. The single accent — Signal Yellow (`#FFCC00`) — earns its authority by appearing only where action is required or state is active. Everywhere else, it is absent.

The system is deliberately spare: thin borders, flat surfaces, a single typeface held across all roles. Chrome disappears; content takes the screen. Operators should feel the same calm authority as someone reading instrument panels, not filling out a CRM form. Confidence is built through information density handled cleanly, not through decoration.

This system explicitly rejects generic SaaS light-mode aesthetics (Notion, Linear look-alikes), gradient-heavy fintech templates, consumer chat app palettes (WhatsApp or Slack visual clones), and overloaded analytics tools with nested sidebar menus everywhere.

**Key Characteristics:**
- Near-void dark canvas — body `#080808`, surfaces `#121212`, no light mode
- Signal Yellow (`#FFCC00`) reserved strictly for primary actions and active state
- Inter across every role; weight contrast replaces typeface contrast
- Flat elevation: surfaces differentiated by tone, not shadow lift
- Minimal radius vocabulary — inputs 8px, cards 12–16px, buttons 16px
- Semantic color vocabulary: error red, warning amber, info blue — no decorative hues

## 2. Colors: The Mission Palette

A near-monochrome system with a single hot signal. Remove the yellow and the palette is pure instrument black. Add it and the eye goes exactly where the operator needs to look.

### Primary
- **Signal Yellow** (`#FFCC00`): The one accent color. Used on primary CTA buttons, active navigation items, focus rings (`outline: 2px solid #FFCC00`), active status dots, and progress fills. Never used as a resting border or background decoration. Its rarity is its power.

### Neutral
- **Void** (`#080808`): Page body background. The deepest layer.
- **Surface** (`#121212`): Card backgrounds, panel fills. One tonal step above void.
- **Surface Raised** (`#1A1A1A`): Secondary panels, muted fills, chip backgrounds, select backgrounds.
- **Border** (`#27272A`): All borders and dividers at rest.
- **Ink** (`#FFFFFF`): Primary text. Full white on dark surfaces.
- **Ink Muted** (`#A1A1AA`): Secondary text, placeholders, metadata, labels.

### Semantic
- **Destructive Red** (`#FF4545`): Error states, destructive action buttons.
- **Warning Amber** (`#F59E0B`): Caution banners and badges.
- **Info Blue** (`#005BAA`): Informational indicators.

**The One Signal Rule.** Signal Yellow appears on ≤5% of any screen. If it feels scattered, there is too much of it. Reduce, never distribute.

**The Semantic Silence Rule.** Success states use Signal Yellow, not green. Nodes Flow does not have a calming green. In this cockpit, positive outcomes are also signal — active, confirmed, go.

## 3. Typography

**Font:** Inter (ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)

One family, all weights. Inter's weight axis — 400 to 700 — provides sufficient role contrast without a second typeface. No display face; this is a tool, not a publication.

**Character:** Precise and recessive. The typeface disappears into the data. Heading tracking at -0.02em gives display copy intentional tension without cramping. Labels use uppercase with loose tracking (0.1em) to lift them out of dense UI without adding weight.

### Hierarchy
- **Display** (700, 2rem, lh 1.1, ls -0.03em): Page-level titles. Appears once per view maximum.
- **Headline** (700, 1.5rem, lh 1.2, ls -0.02em): Section headings, modal titles.
- **Title** (600, 1rem, lh 1.4, ls -0.01em): Card headings, panel labels, navigation section titles.
- **Body** (400, 0.875rem, lh 1.6): All UI text and descriptions. Cap prose at 65–75ch.
- **Label** (600, 0.6875rem, lh 1.2, ls +0.1em, uppercase): Status chips, metadata rows, category tags. Used deliberately — not above every section.

**The Single Family Rule.** Do not introduce a second typeface — not for display, not for mono, not "just for labels." Inter at multiple weights is the entire palette.

## 4. Elevation

This system is flat by default. Cards are distinguished from the body through surface-tone shift (void `#080808` → surface `#121212`), not shadow lift. Shadows appear in two and only two contexts: an ambient glow under the primary action button (the one moment elevation marks urgency), and structural separation for floating UI (modals, dropdowns, tooltips).

### Shadow Vocabulary
- **Signal Glow** (`0 10px 26px -18px rgba(224, 209, 18, 0.75)`): Primary button only. The yellow halo beneath the action call.
- **Ambient XS** (`0 1px 2px rgba(0,0,0,0.5)`): Inputs at rest, small interactive elements.
- **Ambient SM** (`0 2px 4px rgba(0,0,0,0.5)`): Cards, list items with subtle lift on hover.
- **Ambient MD** (`0 4px 8px rgba(0,0,0,0.5)`): Modals, drawers, floating panels.
- **Ambient LG** (`0 8px 16px rgba(0,0,0,0.5)`): Popovers, command palette, elevated tooltips.

**The Flat-By-Default Rule.** Surfaces are tonally differentiated first. Shadows appear only for action feedback (button glow) or layer separation (overlays). A card on `#0a0a0a` body should not need a drop shadow to be perceived.

## 5. Components

### Buttons

The primary button is the only element allowed a colored glow. Every other interactive element earns its state through border shift, opacity, or background tint.

- **Shape:** Gently rounded corners, 16px radius (`rounded-xl`)
- **Primary:** Signal Yellow fill (`#FFCC00`), near-black text (`#080808`), signal glow shadow. Micro-press on `active` (`translateY(1px)`). This is the only button with a shadow.
- **Hover:** Opacity 90% (`#E6B800`). No shape change.
- **Focus:** Yellow ring at 30% opacity (`outline: 2px solid #FFCC00; outline-offset: 2px`). Applies to all variants.
- **Outline:** Yellow-tinted border (`rgba(255,204,0,0.35)`) + yellow-tinted background (`rgba(255,204,0,0.1)`). Ink text. Border darkens on hover.
- **Ghost:** Transparent background, muted ink text. Gains muted surface fill on hover.
- **Soft:** Yellow tint background (`rgba(255,204,0,0.1)`), signal yellow text. Secondary emphasis without button weight.

### Cards / Containers

- **Corner Style:** 12–16px depending on context (panel-level 16px, component-level 12px)
- **Background:** Surface (`#121212`)
- **Border:** `1px solid rgba(39,39,42,0.7)` — border token at 70% opacity
- **Shadow:** Ambient SM at rest. On hover, some cards gain `card-hover-glow` (border shifts toward yellow tint + subtle yellow ambient).
- **Internal Padding:** 24px standard; 20px compact panels; 32px generous sections

### Inputs / Fields

- **Style:** Near-void background (`#080808`), `1px border #27272A`, soft radius (8px)
- **Hover:** Border lifts to `rgba(161,161,170,0.4)` (ink-muted at 40%)
- **Focus:** Yellow ring at 25% opacity + yellow border at 60% opacity
- **Placeholder:** Ink muted at 70%
- **Disabled:** 50% opacity overall
- **Error:** Destructive red border + ring

### Navigation (Sidebar)

- **Background:** Vertical gradient `#141414` → `#0a0a0a`
- **Right border:** `1px solid rgba(255,255,255,0.07)`
- **Expanded width:** 248px; **Collapsed:** 60px
- **Transition:** `width 300ms cubic-bezier(0.16,1,0.3,1)`
- **Default items:** Ink muted icon + label
- **Hover:** White/10% fill, ink text
- **Active:** Signal Yellow icon + text. No background fill. Color alone marks state.
- **Tooltips:** Shown on collapsed mode for all items (delay 0ms)

### Badges / Status Chips

- **Active / Success:** Emerald-tinted (`rgba(52,211,153,0.10)` bg, `#34D399` text, matching border)
- **Inactive:** Border `border/50`, muted-foreground text, muted-foreground/40 dot
- **Category Labels (agents):** Signal-adjacent tones per category — sky for Assistant, amber for Delivery, rose for E-commerce, emerald for Restaurant

## 6. Do's and Don'ts

### Do:
- **Do** use `#FFCC00` Signal Yellow on primary actions, active nav items, focus rings, and active status dots — and nowhere else.
- **Do** differentiate surface layers through tone shift before reaching for shadows: void → surface → raised.
- **Do** use Inter across all roles; vary only weight and size. 700 for headings, 400 for body, 600 for labels.
- **Do** keep borders at `#27272A` at rest. The hover treatment is a border opacity shift + subtle tint, not a color swap.
- **Do** include `active:translate-y-px` on primary buttons. It is the only animation on the action layer.
- **Do** add `prefers-reduced-motion` alternatives to every Framer Motion animation — crossfade or instant transition, never removed entirely.
- **Do** cap prose line lengths at 65–75ch. Data tables and dense panels can run wider.

### Don't:
- **Don't** render any light-mode surface in the dashboard. Nodes Flow is dark-only, deliberately.
- **Don't** use Signal Yellow as a resting border, background fill, or decorative element — these are the most common ways to dilute it.
- **Don't** add a second typeface. Not for display, not for mono labels, not ever.
- **Don't** build gradient-heavy fintech templates, purple/neon AI aesthetics, or generic SaaS light surfaces — these are the explicit anti-references.
- **Don't** visually clone WhatsApp or Slack. Nodes Flow is the infrastructure they run on, not their consumer layer.
- **Don't** use `border-left` wider than 1px as a colored stripe accent on cards or list items. Use full-border tint, icon color, or nothing.
- **Don't** use gradient text (`background-clip: text` with a gradient fill). Solid ink or solid signal only.
- **Don't** put uppercase tracked eyebrows above every section. One deliberate use is voice; one on every section is AI scaffolding. Choose a different cadence.
- **Don't** use arbitrary z-index values (`999`, `9999`). Use the semantic scale: dropdown → sticky → modal-backdrop → modal → toast → tooltip.
