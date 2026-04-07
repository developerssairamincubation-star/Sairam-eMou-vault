# Design System - Sairam eMoU Vault

Complete design documentation for the Sairam eMoU Vault application, including typography, colors, spacing, components, and UI patterns.

---

## 1. Typography

### Font Family
- **Primary Font**: Gabarito (from Google Fonts)
- **Fallback Stack**: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
- **Font Weights Available**: 400, 500, 600, 700
- **Line Height (Default)**: 1.4

### Font Sizes

| Size | Usage | Weight |
|------|-------|--------|
| 11px | Mini stat labels, small captions | 500, 400 |
| 12px | Table headers, panel titles (compact), labels | 600, 500 |
| 13px | Body text, form inputs, table cells, buttons | 400, 500 |
| 14px | Panel titles | 600 |
| 24px | Mini stat values | 700 |
| 32px | Stat card values | 700 |

### Text Styling
- **Text Transform**: `uppercase` applied to many labels with `letter-spacing: 0.025em`
- **Truncation**: Text truncation used in dropdowns and table cells
- **Whitespace Handling**: `whitespace-pre-line` for preserving line breaks in messages

---

## 2. Color Palette

### CSS Variables (Root)
Located in `/app/globals.css`:
```css
--background: #f8f9fa;        /* Page background */
--foreground: #1f2937;        /* Primary text color */
--border-color: #d1d5db;      /* Border default color */
--header-bg: #f3f4f6;         /* Table header background */
--row-hover: #f9fafb;         /* Table row hover state */
```

### Primary Colors
| Color | Hex | Usage |
|-------|-----|-------|
| Dark Gray | #1f2937 | Primary text, buttons, headings, badges |
| Medium Gray | #4b5563 | Secondary text, table column headers |
| Light Gray | #6b7280 | Disabled text, labels |
| Lighter Gray | #9ca3af | Tertiary text, percentages |

### Neutral/Background Colors
| Color | Hex | Usage |
|-------|-----|-------|
| White | #ffffff | Component backgrounds |
| Very Light Gray | #f8f9fa | Page background |
| Light Gray | #f3f4f6 | Header background, disabled inputs |
| Lighter Gray | #f9fafb | Row hover, alternate row background |
| Even Lighter | #fafbfc | Table row alternate background |
| Border Gray | #d1d5db | Borders |
| Divider Gray | #e5e7eb | Dividers, borders, progress backgrounds |

### Semantic Colors (Tailwind)
| Type | Color | Hex | Usage |
|------|-------|-----|-------|
| Success | emerald-500 | #10b981 | Success alerts, check icons |
| Error | red-500/red-600 | #ef4444 | Error alerts, danger buttons |
| Warning | amber-500 | #f59e0b | Warning alerts |
| Warning (alt) | orange-500/600 | #f97316 | Alternative warning styling |
| Info | blue-500/600 | #3b82f6 | Info alerts, hyperlinks |
| Blue (select) | blue-100/600 | #dbeafe/#2563eb | Selected items, checkboxes |
| Gray | gray-100-400 | Various | General UI gray variants |
| Neutral | neutral-100-800 | Various | Neutral dropdowns, inputs |

### Alert Colors
- **Success**: `bg-white` + `border-l-4 border-emerald-500`
- **Error**: `bg-white` + `border-l-4 border-red-500`
- **Warning**: `bg-white` + `border-l-4 border-amber-500`
- **Info**: `bg-white` + `border-l-4 border-blue-500`

### Button Colors
- **Primary Button**: `bg-#1f2937` text-white, hover: `bg-#111827`
- **Secondary Button**: `bg-white` text-gray, border: `border-#d1d5db`, hover: `bg-#f9fafb`
- **Danger Button**: `bg-red-600` hover: `bg-red-700`
- **Warning Button**: `bg-orange-600` hover: `bg-orange-700`
- **Info Button**: `bg-blue-600` hover: `bg-blue-700`

### Input Focus Colors
- **Focus Border**: `#2563eb` (blue-600)
- **Focus Ring**: `rgba(37, 99, 235, 0.1)` with `box-shadow: 0 0 0 3px`

---

## 3. Spacing & Layout

### Padding & Margins (Tailwind-based)

| Component | Padding | Margin |
|-----------|---------|--------|
| Button (Standard) | `px-4 py-2` or `px-6 py-3` | - |
| Button (Compact) | `px-3 py-1.5` or `px-2 py-1` | - |
| Form Input | `px-3 py-2` or `px-2 py-1` | - |
| Table Cell | `padding: 6px 10px` | - |
| Table Cell (Compact) | `padding: 6px` | - |
| Dashboard Panel | `p-6` or `p-4` | - |
| Alert Message | `px-4 py-3` | - |
| Dialog Padding | `p-6` (header), `px-6 py-4` (footer) | - |

### Gaps & Spacing
| Spacing | Value | Usage |
|---------|-------|-------|
| Extra Small | 1px, 2px, 4px | Border widths, dividers |
| Small | 6px, 8px | Compact spacing |
| Medium | 12px, 16px | Standard spacing |
| Large | 20px, 24px | Panel spacing |
| Extra Large | 32px+ | Section spacing |

### Height Standards
| Element | Height | Usage |
|---------|--------|-------|
| Progress bar (standard) | 6px | Dashboard progress bars |
| Progress bar (compact) | 4px | Compact dashboard |
| Stat icon container | 40px | Dashboard stat card icons |
| Stat icon (compact) | 32px | Compact mode |
| Dept rank badge (standard) | 32px × 32px | Department ranking |
| Dept rank badge (compact) | 24px × 24px | Compact ranking |
| Input field | ~32px | Standard form inputs |
| Row height (table) | ~34px | Standard table rows |

### Width Standards
| Element | Width | Usage |
|---------|-------|-------|
| Stat icon container | 40px | Dashboard icons |
| Stat icon (compact) | 32px | Compact dashboard |
| Dept rank badge | 32px | Ranking display |
| Dept rank badge (compact) | 24px | Compact ranking |
| Scrollbar | 10px | Custom webkit scrollbar |
| Scrollbar (height) | 10px | Custom webkit scrollbar |
| Min dropdown width | 160-280px | Varies by dropdown type |
| Multi-select chip | inline-flex | As needed for text |
| Popup width | max-w-4xl (896px) | Record detail popup |

---

## 4. Border & Radius

### Border Styles
| Style | Value | Usage |
|-------|-------|-------|
| Default Border | `1px solid var(--border-color)` | Cards, inputs, panels |
| Bold Border | `2px solid` | Dropdown selections, focused inputs |
| Left Border | `border-l-4` | Alert indicators |
| Bottom Border | `border-b` | Dividers, underlines |
| Top Border | `border-t` | Separators |

### Border Radius
| Radius | Value | Usage |
|--------|-------|-------|
| Small | 4px | Buttons, badges, inputs |
| Medium | 6px | Cards, stat icons, dept cards |
| Large | 8px | Dashboard panels, dialogs |
| Circular | 50% | Avatar-like elements, full circles |
| Pill | 9999px | Chip/tag elements |

### Specific Components
- **Input fields**: `border-radius: 4px`
- **Buttons**: `border-radius: 4px`
- **Icons (40px)**: `border-radius: 6px`
- **Icons (32px)**: `border-radius: 6px`
- **Stat cards**: `border-radius: 8px`
- **Dashboard panels**: `border-radius: 8px`
- **Dialogs/Modals**: `border-radius: 8px`
- **Progress bars**: `border-radius: 3px`
- **Dept cards**: `border-radius: 6px`
- **Dept rank**: `border-radius: 6px` (standard), `border-radius: 4px` (compact)

---

## 5. Shadows & Effects

### Box Shadows
| Level | Shadow | Usage |
|-------|--------|-------|
| Default | none/subtle | Cards, panels |
| Medium | `shadow-lg` | Dropdowns, alerts |
| High | `shadow-xl` | Modals, popups, important overlays |
| Backdrop | `backdrop-blur-sm` | Modal backdrops |

### Transitions & Animations
| Duration | Value | Usage |
|----------|-------|-------|
| Fast | 0.15s, 0.2s | Hover states, quick feedback |
| Standard | 0.3s | State changes, animations |
| Slow | 0.15s-0.3s | Dropdown animation |

### Animation Classes
| Animation | Duration | Easing | Usage |
|-----------|----------|--------|-------|
| slide-in | 0.3s | ease-out | Alert slide from right |
| scale-in | 0.2s | ease-out | Dialog appear (scale up) |
| bounceIn | 0.3s-0.4s | ease-out | Tooltip popup (legacy) |
| smoothBounceIn | 0.6s | ease-out | Tooltip popup (current) |
| dropdownIn | 0.15s | ease-out | Dropdown menu appear |
| Fade/Transform | 0.15s-0.3s | ease-out | Various state changes |

### Keyframe Definitions
```css
@keyframes slide-in {
  from: translateX(100%), opacity: 0
  to: translateX(0), opacity: 1
}

@keyframes scale-in {
  from: scale(0.9), opacity: 0
  to: scale(1), opacity: 1
}

@keyframes bounceIn {
  0%: scale(0.3) translateY(-20px), opacity: 0
  50%: opacity: 1, scale(1.05)
  70%: scale(0.9)
  100%: scale(1), opacity: 1
}

@keyframes smoothBounceIn {
  0%: scale(0.8) translateY(-10px), opacity: 0
  60%: scale(1.02), opacity: 1
  80%: scale(0.98)
  100%: scale(1), opacity: 1
}

@keyframes dropdownIn {
  from: opacity: 0, translateY(-4px) scale(0.98)
  to: opacity: 1, translateY(0) scale(1)
}
```

### Scrollbar Styling (Webkit)
```css
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  background: #f3f4f6;
}

::-webkit-scrollbar-thumb {
  background-color: #000000;
  border-radius: 4px;
}
```

---

## 6. Components

### Buttons

#### Standard Button (.btn)
- **Padding**: `6px 14px`
- **Font Size**: 13px
- **Font Weight**: 500
- **Border Radius**: 4px
- **Transition**: all 0.15s ease
- **Border**: 1px solid transparent

#### Button Variants
**Primary (.btn-primary)**
- Background: #1f2937
- Color: white
- Border: #1f2937
- Hover: #111827

**Secondary (.btn-secondary)**
- Background: white
- Color: #4b5563
- Border: #d1d5db
- Hover: #f9fafb

**Tailwind Buttons**
- Compact: `px-3 py-1.5` text-xs
- Standard: `px-4 py-2` text-sm
- Large: `px-6 py-3` text-base
- Rounded: 4px default, 6-8px for dialogs

### Form Elements

#### Input, Select, Textarea
- **Font Family**: inherit
- **Font Size**: 13px
- **Padding**: `6px 10px`
- **Border**: `1px solid var(--border-color)`
- **Border Radius**: 4px
- **Background**: white

#### Focus State
- **Outline**: none
- **Border Color**: #2563eb
- **Box Shadow**: `0 0 0 3px rgba(37, 99, 235, 0.1)`

#### Disabled State
- **Background**: #f3f4f6
- **Color**: #6b7280
- **Cursor**: not-allowed

### Table (.sheet-table)

#### Container
- **Border Collapse**: collapse
- **Width**: 100%
- **Font Size**: 13px
- **Background**: white

#### Headers (th)
- **Background**: var(--header-bg) #f3f4f6
- **Font Weight**: 600
- **Position**: sticky
- **Top**: 0
- **Z-Index**: 10
- **Font Size**: 12px
- **Text Transform**: uppercase
- **Letter Spacing**: 0.025em
- **Color**: #4b5563
- **Padding**: 6px 10px
- **Border**: 1px solid var(--border-color)

#### Cells (td)
- **Padding**: 6px 10px
- **Border**: 1px solid var(--border-color)
- **Text Align**: left
- **Vertical Align**: middle

#### Row Hover
- **Background**: var(--row-hover) #f9fafb

#### Alternate Rows
- **Even Row Background**: #fafbfc
- **Even Row Hover**: var(--row-hover) #f9fafb

### Dialog/Modal

#### Backdrop
- **Background**: black/50% opacity
- **Display**: fixed, inset-0
- **Z-Index**: 50

#### Container
- **Background**: white
- **Border Radius**: 8px
- **Shadow**: shadow-xl
- **Max Width**: max-w-md (448px) or max-w-4xl (896px)
- **Width**: full
- **Margin**: 4 (1rem on sides)
- **Animation**: animate-scale-in

#### Header
- **Padding**: 6 (1.5rem)
- **Title Font Size**: text-lg
- **Title Font Weight**: semibold
- **Title Color**: #1f2937
- **Message Font Size**: text-sm
- **Message Color**: #6b7280

#### Footer
- **Background**: #f8f9fa
- **Padding**: px-6 py-4
- **Display**: flex
- **Justify**: end
- **Gap**: 3
- **Border Radius Bottom**: lg

### Alerts

#### Container
- **Position**: fixed top-4 right-4
- **Z-Index**: 50
- **Animation**: animate-slide-in
- **Background**: white
- **Border Radius**: lg
- **Shadow**: shadow-xl
- **Backdrop**: backdrop-blur-sm
- **Min Width**: 320px
- **Max Width**: 480px
- **Overflow**: hidden

#### Content
- **Padding**: px-4 py-3
- **Display**: flex
- **Gap**: 3
- **Font Size**: text-sm
- **Line Height**: relaxed
- **Icon Size**: w-5 h-5

#### Types
- **Success**: border-l-4 border-emerald-500, icon color emerald-500
- **Error**: border-l-4 border-red-500, icon color red-500
- **Warning**: border-l-4 border-amber-500, icon color amber-500
- **Info**: border-l-4 border-blue-500, icon color blue-500

### Dropdowns

#### Trigger Button
- **Width**: w-full
- **Display**: flex items-center justify-between
- **Padding**: px-3 py-2
- **Background**: bg-white
- **Border**: border border-black or 2px when open
- **Shadow**: shadow-sm
- **Text Align**: left
- **Text Size**: text-sm
- **Transition**: all duration-150
- **Icon Size**: 16px
- **Border Radius**: varies (4px standard, 6px compact, 8px for searchable)

#### Options Container
- **Position**: absolute/fixed
- **Z-Index**: 50 or 10000
- **Margin Top**: mt-1
- **Min Width**: min-w-[160px] to min-w-[280px]
- **Background**: bg-white
- **Border**: border-2 border-black
- **Border Radius**: rounded-md or rounded-lg
- **Shadow**: shadow-xl
- **Max Height**: max-h-60 or max-h-[240px] or max-h-[300px]
- **Overflow**: auto
- **Animation**: animate-[dropdownIn_0.15s_ease-out]

#### Option Item
- **Padding**: px-3 py-2
- **Cursor**: pointer
- **Font Size**: text-sm or text-xs
- **Transition**: colors duration-75
- **Highlighted**: bg-neutral-100 or bg-neutral-200
- **Selected**: text-black font-semibold bg-neutral-100
- **Hover**: bg-neutral-200
- **Check Icon**: FiCheck, size 16 or 14

#### Cell Dropdown Variants
**Fast Dropdown**
- Border: 2px border-black
- Animation: None

**Searchable Dropdown**
- Max Height: 300px
- Fixed positioning
- Search input: py-1.5 text-xs
- Search placeholder: "Search..."
- No results: text-xs text-gray-400

**Multi-Select Dropdown**
- Min Width: 300px
- Max Height: 360px
- Flex: flex-col
- Checkbox color: blue-600
- Selected tags: bg-blue-100 text-blue-700 border border-blue-300

### Cards & Panels

#### Dashboard Panel (.dashboard-panel)
- **Background**: white
- **Border**: 1px solid var(--border-color)
- **Border Radius**: 8px
- **Padding**: 24px
- **Display**: flex flex-col

#### Panel Title (.panel-title)
- **Font Size**: 14px
- **Font Weight**: 600
- **Color**: #1f2937
- **Text Transform**: uppercase
- **Letter Spacing**: 0.025em
- **Margin Bottom**: 16px
- **Padding Bottom**: 12px
- **Border Bottom**: 1px solid #e5e7eb

#### Panel Title Compact (.panel-title-sm)
- **Font Size**: 12px
- **Font Weight**: 600
- **Margin Bottom**: 8px
- **Padding Bottom**: 8px

#### Stat Card (.stat-card)
- **Background**: white
- **Border**: 1px solid var(--border-color)
- **Border Radius**: 8px
- **Padding**: 20px
- **Display**: flex flex-col
- **Gap**: 8px

#### Stat Card Compact (.stat-card-compact)
- **Border Radius**: 6px
- **Padding**: 12px

#### Stat Icon Container (.stat-icon-container)
- **Width**: 40px
- **Height**: 40px
- **Border Radius**: 6px
- **Display**: flex (center)

#### Stat Icon Container (Compact)
- **Width**: 32px
- **Height**: 32px
- **Border Radius**: 6px

#### Stat Value (.stat-value)
- **Font Size**: 32px
- **Font Weight**: 700
- **Color**: #1f2937
- **Line Height**: 1

#### Stat Label (.stat-label)
- **Font Size**: 12px
- **Font Weight**: 500
- **Color**: #6b7280
- **Text Transform**: uppercase
- **Letter Spacing**: 0.025em

#### Stat Percentage (.stat-percentage)
- **Font Size**: 11px
- **Color**: #9ca3af

#### Department Card (.dept-card)
- **Padding**: 16px
- **Background**: #f9fafb
- **Border Radius**: 6px
- **Border**: 1px solid #e5e7eb

#### Department Rank Badge (.dept-rank)
- **Width**: 32px
- **Height**: 32px
- **Border Radius**: 6px
- **Background**: #1f2937
- **Color**: white
- **Display**: flex (center)
- **Font Weight**: 700
- **Font Size**: 14px

#### Department Rank Compact (.dept-rank-sm)
- **Width**: 24px
- **Height**: 24px
- **Border Radius**: 4px
- **Font Size**: 12px

#### Mini Stat (.mini-stat)
- **Text Align**: center
- **Padding**: 12px
- **Background**: #f9fafb
- **Border Radius**: 6px

#### Mini Stat Value (.mini-stat-value)
- **Font Size**: 24px
- **Font Weight**: 700
- **Line Height**: 1

#### Mini Stat Label (.mini-stat-label)
- **Font Size**: 11px
- **Color**: #6b7280
- **Margin Top**: 4px
- **Text Transform**: uppercase
- **Letter Spacing**: 0.025em

#### Insight Box (.insight-box)
- **Background**: #f9fafb
- **Border**: 1px solid #e5e7eb
- **Border Radius**: 6px
- **Padding**: 12px
- **Text Align**: center

### Progress Bars

#### Standard Progress (.progress-bar + .progress-fill)
- **Width**: 100%
- **Height**: 6px
- **Background**: #e5e7eb
- **Border Radius**: 3px
- **Overflow**: hidden
- **Fill Background**: `linear-gradient(90deg, #1f2937 0%, #4b5563 100%)`
- **Transition**: width 0.3s ease

#### Compact Progress (.progress-bar-sm + .progress-fill-sm)
- **Height**: 4px
- **Border Radius**: 2px
- **Fill Radius**: 2px

### Confirmation Dialog

#### Backdrop
- **Position**: fixed inset-0
- **Background**: bg-black/50
- **Display**: flex items-center justify-center
- **Z-Index**: 50

#### Dialog Container
- **Background**: white
- **Border Radius**: 8px
- **Shadow**: shadow-xl
- **Max Width**: max-w-md (448px)
- **Width**: full
- **Margin**: 4 (1rem)
- **Animation**: animate-scale-in

#### Header
- **Padding**: 6 (1.5rem)
- **Title Font Size**: text-lg
- **Font Weight**: semibold
- **Color**: #1f2937
- **Margin Bottom**: 2
- **Message Font Size**: text-sm
- **Message Color**: #6b7280

#### Footer
- **Background**: #f8f9fa
- **Padding**: px-6 py-4
- **Display**: flex justify-end gap-3
- **Border Radius**: rounded-b-lg
- **Button Spacing**: gap-3

#### Buttons
- **Cancel**: px-4 py-2 text-sm font-medium text-#4b5563 bg-white border border-#d1d5db rounded hover:bg-#f3f4f6
- **Confirm (Danger)**: px-4 py-2 bg-red-600 hover:bg-red-700
- **Confirm (Warning)**: px-4 py-2 bg-orange-600 hover:bg-orange-700
- **Confirm (Info)**: px-4 py-2 bg-blue-600 hover:bg-blue-700

---

## 7. Icons

### Icon Library
- **Library**: react-icons (Feather Icons - FiXxx)
- **Sizes**: 14px, 16px, 24px depending on context
- **Color**: Usually inherited (text color), with specific colors for alerts
- **Icon Types Used**:
  - FiEdit2 (edit)
  - FiTrash2 (delete)
  - FiEye (view)
  - FiCalendar (date)
  - FiChevronDown (dropdown)
  - FiUpload (upload)
  - FiCheckCircle (check/success)
  - FiXCircle (cross/error)
  - FiClock (time)
  - FiCheck (checkmark)
  - FiSearch (search)
  - FiX (close)

### Icon Styling Examples
- **Alert Icons**: w-5 h-5 with semantic colors (emerald-500, red-500, amber-500, blue-500)
- **Dropdown Icons**: size 16 or 14, text-black or text-neutral-400
- **Checkmark in Dropdowns**: size 16 or 14, text-black

---

## 8. Responsive Design

### Breakpoints (Tailwind)
- Mobile-first approach
- Standard Tailwind breakpoints:
  - **sm**: 640px
  - **md**: 768px
  - **lg**: 1024px
  - **xl**: 1280px
  - **2xl**: 1536px

### Responsive Patterns

#### Tables
- Sticky headers and columns
- Horizontal scroll on mobile
- Action columns sticky right
- Responsive column widths

#### Dialogs
- Max width on large screens
- Full width with margins on small screens
- Centered positioning

#### Dropdowns
- Position: absolute on normal, fixed for cell-level
- Z-index management for layering
- Scroll within viewport bounds

#### Dashboard
- Card-based grid layout
- Flexible columns
- Compact variants for smaller screens

---

## 9. Z-Index Scale

| Level | Z-Index | Usage |
|-------|---------|-------|
| Background | default | Body, default content |
| Sticky Headers | 10 | Table headers |
| Dropdowns | 50, 10000 | Standard and cell dropdowns |
| Modals | 50 | Dialog backgrounds, modals |
| Alerts | 50 | Toast notifications |

---

## 10. Consistent Patterns

### Color Consistency
- Always use CSS variables for brand colors from `:root`
- Tailwind colors for semantic states (red, green, blue, amber)
- Neutral grays from Tailwind for secondary elements
- Black borders (#000000) for focused states in dropdowns

### Spacing Consistency
- 4px base unit for most spacing
- Padding: 2px, 4px, 6px, 8px, 10px, 12px, 14px, 16px, 20px, 24px
- Margin: 0, 4px, 8px, 12px, 16px, 24px
- Gap: 2px, 3px, 4px, 6px, 8px, 12px, 16px

### Border Consistency
- 1px for default borders
- 2px for focused/selected states
- 4px for accent borders (alerts)
- Radius: 3px (progress), 4px (buttons/inputs), 6px (cards), 8px (panels)

### Typography Consistency
- 13px base size for body content
- 12px for secondary/labels
- 14px+ for headings
- Weight: 400 (body), 500 (labels), 600 (headings), 700 (values)
- Uppercase with 0.025em letter-spacing for labels/headers

### Animation Consistency
- 0.15s-0.3s for state changes
- ease-out for appearing transitions
- Slide, scale, or fade for entrance animations
- Smooth transitions on all interactive elements

### Shadow Consistency
- No shadow: body, inputs
- shadow-sm: buttons, inputs on hover
- shadow-lg: alerts
- shadow-xl: dropdowns, modals, important elements

---

## 11. Dark Mode & Theme Support

Currently the design system supports:
- Light theme (default)
- CSS variables in `:root` for easy theme switching
- Color schemes defined via Tailwind and custom CSS

(Dark mode implementation can extend the `:root` variables)

---

## 12. Accessibility Considerations

### Built-in Patterns
- Focus indicators: `outline: none`, `border-color: #2563eb`, `ring: 3px rgba(37, 99, 235, 0.1)`
- Disabled states have reduced opacity and cursor change
- Semantic HTML usage (buttons, form elements)
- ARIA labels on closeable alerts
- High contrast colors for readability

### Keyboard Navigation
- Tab through inputs and buttons
- Arrow keys for dropdown selection
- Enter to select
- Escape to close modals/dropdowns
- Screen reader friendly

---

## 13. Component Size Reference

### Icon Sizes
- **Small**: 10px, 11px (close icons)
- **Standard**: 14px, 16px (most icons)
- **Medium**: 24px (stat icons)
- **Large**: 32px (hero icons)

### Button Sizes
- **X-Small**: height ~24px, px-2 py-1, text-xs
- **Small**: height ~32px, px-3 py-1.5, text-xs
- **Medium**: height ~36px, px-4 py-2, text-sm
- **Large**: height ~44px, px-6 py-3, text-base

### Input Heights
- **Compact**: ~28-30px for inline editing
- **Standard**: ~32-36px for forms
- **Tall**: ~40px+ for special inputs

---

## 14. Edge Cases & Special Styles

### Sticky Elements
- Table headers: `position: sticky; top: 0; z-index: 10`
- Sticky columns: `position: sticky; right/left: Xpx; z-index: varies`
- Sidebar nav (if present): managed with flex layout

### Overflow Handling
- Tables: `overflow-x: auto` for horizontal scroll
- Dropdowns: `max-h-Xpx overflow-auto`
- Modals: `overflow: hidden` to prevent background scroll
- Content: `whitespace-pre-line` for formatted text

### Truncation
- Single line: `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`
- Multi-line: `line-clamp-X` (Tailwind)
- In chips: `truncate` class applied

### Positioned Elements
- Dropdowns: `position: fixed` for cell-level to escape table stacking context
- Alerts: `position: fixed` for always visible
- Modals: `position: fixed inset-0` for full-screen overlay

---

## 15. Tools & Build System

### CSS Framework
- **Tailwind CSS v4** with @tailwindcss/postcss
- Custom global CSS in `/app/globals.css`
- CSS variables for theming

### Font System
- **Google Fonts**: Gabarito
- Fallback system fonts for robustness
- Multiple weight support (400, 500, 600, 700)

### Build & Development
- Next.js 16.1.4
- React 19.2.3
- TypeScript for type safety

---

## Summary

The design system is built on:
1. **Clear color palette** with semantic meanings and CSS variables for theming
2. **Consistent typography** with Gabarito font and defined size scales
3. **Systematic spacing** using 4px base units for alignment
4. **Reusable components** with defined padding, borders, and shadows
5. **Smooth animations** with consistent durations and easing
6. **Accessibility** through color contrast, keyboard navigation, and semantic HTML
7. **Responsive design** that adapts from mobile to desktop
8. **Dark mode ready** with CSS variable support for theme switching
