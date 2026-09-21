---
name: Local Commerce Discovery System
colors:
  surface: '#f8f9fc'
  surface-dim: '#d8dadd'
  surface-bright: '#f8f9fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f7'
  surface-container: '#eceef1'
  surface-container-high: '#e6e8eb'
  surface-container-highest: '#e0e3e6'
  on-surface: '#191c1e'
  on-surface-variant: '#43474d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f4'
  outline: '#73777e'
  outline-variant: '#c3c7ce'
  surface-tint: '#436180'
  primary: '#001020'
  on-primary: '#ffffff'
  primary-container: '#002642'
  on-primary-container: '#708eaf'
  inverse-primary: '#abc9ed'
  secondary: '#8a5100'
  on-secondary: '#ffffff'
  secondary-container: '#fe9800'
  on-secondary-container: '#643900'
  tertiary: '#001309'
  on-tertiary: '#ffffff'
  tertiary-container: '#002b1a'
  on-tertiary-container: '#2f9d70'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d0e4ff'
  primary-fixed-dim: '#abc9ed'
  on-primary-fixed: '#001d34'
  on-primary-fixed-variant: '#2a4967'
  secondary-fixed: '#ffdcbd'
  secondary-fixed-dim: '#ffb86f'
  on-secondary-fixed: '#2c1600'
  on-secondary-fixed-variant: '#693c00'
  tertiary-fixed: '#8ef7c2'
  tertiary-fixed-dim: '#72daa8'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005235'
  background: '#f8f9fc'
  on-background: '#191c1e'
  surface-variant: '#e0e3e6'
typography:
  display:
    fontFamily: Bricolage Grotesque
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
  display-mobile:
    fontFamily: Bricolage Grotesque
    fontSize: 34px
    fontWeight: '800'
    lineHeight: 40px
  headline-lg:
    fontFamily: Bricolage Grotesque
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
  headline-lg-mobile:
    fontFamily: Bricolage Grotesque
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Bricolage Grotesque
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
  headline-sm:
    fontFamily: Bricolage Grotesque
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
  price-hero:
    fontFamily: Bricolage Grotesque
    fontSize: 28px
    fontWeight: '800'
    lineHeight: 32px
  price-card:
    fontFamily: Bricolage Grotesque
    fontSize: 20px
    fontWeight: '800'
    lineHeight: 24px
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Manrope
    fontSize: 15px
    fontWeight: '500'
    lineHeight: 22px
  body-sm:
    fontFamily: Manrope
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  label-lg:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
  label-md:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
  label-xs:
    fontFamily: Manrope
    fontSize: 10px
    fontWeight: '800'
    lineHeight: 12px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system expresses a high-energy, community-rooted commerce platform bridging local discovery with marketplace efficiency. The interface draws inspiration from real-time navigation tools and modern delivery services, adopting a dynamic utilitarian style: high-contrast accents, purposeful visual signaling, dense information architecture softened by pill-shaped geometries, and warm foundational paper surfaces.

The emotional signature is direct, cheerful, and actionable. Users must immediately understand where savings exist in physical space, how close they are, and how each deal is acquired (direct local Click & Collect versus online merchant affiliation).

Key style markers:
- **Paper Canvas Foundation**: Crisp off-white tinted paper backgrounds prevent sterile digital flatness and anchor physical neighborhood warmth.
- **Vibrant Spatial Signaling**: Map pins, proximity badges, and discount pills employ energetic high-visibility accents (vibrant orange and deep maritime navy) ensuring instant visual parsing during rapid browsing.
- **Dual-Engine Clarity**: Distinct visual grammar separating physical in-store pickups from external partner offers at a glance.

## Colors

The palette balances authoritative structural depth with urgent retail energy:

- **Primary (`#002642` - Deep Navy)**: Used for high-impact typography, headers, map anchor surfaces, active states, and structural contrast.
- **Secondary (`#FF9900` - Signal Orange)**: The dynamic conversion driver. Reserved for primary action buttons (CTAs), clearance tags ("DÉSTOCKAGE"), promotional badges, price highlights, and active map location pins.
- **Tertiary (`#0E8A5E` - Emerald)**: Encodes direct local commerce (Click & Collect, live store status "OUVERT", and active proximity validation).
- **Affiliation Accent (`#4361EE` / `#312E81` - Indigo Partner)**: A calm, distinct tone applied strictly to external merchant links and affiliate partner badges to prevent cognitive confusion with in-store stock.
- **Backgrounds & Containers**:
  - Global Canvas: `#FBFAF8` (Soft warm paper)
  - Neutral Containers & Input Tracks: `#F2F3F5`
  - Structural Divider & Card Outlines: `#E7E9EC`
  - Elevated Surfaces & Active Cards: `#FFFFFF`

### State & Signal Tokens
- **Badge Déstockage**: Background `#FF9900`, Text `#002642`, weight bold.
- **Badge Promotion**: Background `#FFF3E0`, Text `#B25900`.
- **Badge Click & Collect**: Background `#E6F7F0`, Border `#A3E5CB`, Text `#085439`.
- **Badge Partenaire / Affiliation**: Background `#EEF2FF`, Border `#C7D2FE`, Text `#312E81`.
- **Badge Remise (-50%, -75%)**: High-contrast pill in `#002642` with `#FF9900` or `#FFFFFF` bold numerals.

## Typography

The type system blends street-level punchiness with fluid mobile legibility:

- **Bricolage Grotesque** brings condensed, punchy personality to deal titles, price callouts, category banners, and discount numerals. It communicates retail urgency without feeling generic.
- **Manrope** provides a balanced geometric baseline for product specifications, proximity markers ("À 1.2 km - Nice Centre"), store names, badges, and interactive navigation elements.

Typography rules:
- Prices must always be rendered in `Bricolage Grotesque` bold. The crossed-out initial reference price is displayed in `Manrope` medium with a lightened slate tint.
- All badge copy (`label-md`, `label-xs`) uses uppercase tracking (`+0.04em`) to ensure legibility on compact mobile card headers.

## Layout & Spacing

The layout adapts to three key form factors, accommodating both conventional feed browsing and continuous split-screen map navigation:

- **Desktop (>= 1024px)**: Dual-pane split-screen viewport layout.
  - Left pane (55% to 60% width): Scrollable feed showing localized filters, active radius chip, and auto-arranging responsive deal grid (2 to 3 columns).
  - Right pane (40% to 45% width): Fixed full-height interactive map (Waze/Glovo model) synced with hover/selection states in the feed.
- **Tablet (768px - 1023px)**: Adaptive 2-column grid with a floating contextual action button "Voir la carte" launching a drawer or 50/50 vertical view.
- **Mobile (< 768px)**: Single column stream with a sticky bottom interaction bar containing map toggle, saved deals, and geo-filter drawer.

Spacers and layout grids use a baseline 4px / 8px rhythm. Deal card internal content maintains `space-md` (16px) margins with compressed `space-xs` (4px) gaps between pricing and source tags.

## Elevation & Depth

Visual hierarchy leverages crisp card boundaries backed by subtle ambient diffusion:

- **Level 0 (Flat Canvas)**: `#FBFAF8` base canvas; container modules in `#F2F3F5` with no shadow.
- **Level 1 (Resting Cards & Filter Pills)**: `#FFFFFF` surface with a crisp 1px `#E7E9EC` border and an ambient shadow `0 2px 8px -2px rgba(0, 38, 66, 0.05)`.
- **Level 2 (Hovered Cards & Interactive Map Pins)**: Surface transforms via `-2px` translateY, a lightened navy boundary tint `#D0D7DE`, and an expanded shadow `0 8px 24px -4px rgba(0, 38, 66, 0.10)`.
- **Level 3 (Modal Drawers & Geo Location Chooser)**: Elevated center overlays and bottom sheets with `0 16px 40px -8px rgba(0, 38, 66, 0.22)` over an alpha backdrop blur (`rgba(0, 38, 66, 0.40)` with `backdrop-filter: blur(6px)`).
- **Level 4 (Active Map Tooltip / Floating Pin)**: Popover anchored above pin with `0 4px 16px rgba(255, 153, 0, 0.25)` and solid `#002642` or `#FFFFFF` enclosure.

## Shapes

The design system incorporates generous curvature to evoke approachable, everyday community commerce:

- **Deal & Merchant Cards**: Rounded corners of `16px` to `20px` (`rounded-lg` to `rounded-xl`), creating distinct container envelopes that soften imagery.
- **Pill System (`rounded-full` / `9999px`)**: Mandated for all primary CTAs, action chips, category pills, radius adjustment handles, and promotional badges.
- **Map Pin Landmark**: Signature "A-Pin" geometry marrying a teardrop top radius with a defined pinpoint bottom anchor.
- **Inputs & Geo Search Bars**: Enclosed in continuous full-pill (`9999px`) or `16px` containers for single-touch tactile ease.

## Components

### 1. Geolocation Selector (Signature Bar)
- **Resting Appearance**: Full-pill component featuring a pin icon in `#FF9900`, bold typography indicating current anchor (e.g., "1 rue du Soleil, Nice"), an inline separator dot, and the current radius selector ("Rayon 5 km").
- **Trigger Behavior**: Clicking opens a modal or bottom sheet with an interactive slider (1 km to 50 km) accompanied by quick-preset chips (2 km, 5 km, 10 km, 20 km) and an address autocomplete input.

### 2. Deal Cards (Unified Structure with Dual-Circuit Logic)
- **Card Anatomy**:
  - Image container (1:1 or 4:3) with `rounded-t-2xl` boundary.
  - Floating top-left: Discount percentage pill (Navy `#002642` with Orange text).
  - Floating top-right: Stock/condition tag ("DÉSTOCKAGE", "PROMOTION", or "-70%").
  - Content block: Product title, local business name, walk/drive distance ("À 850m").
  - Pricing display: Accentuated discounted price in `Bricolage Grotesque` bold alongside strikethrough retail price.
  - **Circuit Differentiation Zone**:
    - **Click & Collect (Circuit Direct)**: Emerald badge with store icon ("Retrait magasin"), paired with a solid Navy CTA button: "Réserver & Retirer".
    - **Affiliation Partner (Circuit Digital)**: Slate/Indigo badge with external link arrow ("Site partenaire"), paired with a secondary outline or softened CTA: "Voir l'offre en ligne".

### 3. Interactive Map Pins
- Standard deal pin: Orange circular badge `#FF9900` with white silhouette icon, pulsing lightly when matched in feed hover.
- Click & Collect hub pin: Navy `#002642` pin with an emerald check indicator.
- Cluster pin: Deep navy pill displaying deal counts in white `Bricolage Grotesque` text.

### 4. Buttons
- **Primary ("Action Immédiate")**: Pill-shaped (`9999px`), `#FF9900` background, `#002642` bold text. On hover: slight scale (`1.02`), shadow reinforcement.
- **Secondary ("Réserver Magasin")**: Pill-shaped, `#002642` background, `#FFFFFF` text.
- **Partner / External**: Pill-shaped, transparent with 1.5px `#E7E9EC` border, `#002642` text, external icon trailing.

### 5. Filter Chips & Radius Toggles
- Height 36px to 40px, pill shape, soft gray track `#F2F3F5`.
- Selected state: Inverted to `#002642` background with `#FFFFFF` text and orange indicator count dot.