# Sairam eMoU Vault - Design System Documentation

Complete design theme and style guide for maintaining UI consistency across projects.

---

## 1. Technology Stack

### Frontend Framework
- **Next.js**: v16.1.4
- **React**: 19.2.3
- **Styling**: Tailwind CSS v4 with PostCSS
- **TypeScript**: v5
- **Icons**: React Icons v5.5.0
- **Charts**: Recharts v3.7.0

### Key Dependencies
```json
{
  "next": "16.1.4",
  "react": "19.2.3",
  "react-dom": "19.2.3",
  "react-icons": "^5.5.0",
  "recharts": "^3.7.0",
  "tailwindcss": "^4",
  "@tailwindcss/postcss": "^4",
  "typescript": "^5"
}
```

---

## 2. Typography

### Primary Font Family
- **Font**: Gabarito (Google Fonts)
- **Fallback**: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
- **Available Weights**: 400, 500, 600, 700
- **CSS Variable**: `--font-gabarito`

### Font Sizing
- **Body Default**: 13px
- **Small Text**: 12px (headers), 11px (labels)
- **Headings**: 14px (section titles)
- **Card Titles**: 32px (stat values), 24px (mini stats)
- **Line Height**: 1.4 (body), 1 (stats)

### Text Hierarchy
```css
/* Section Titles */
font-size: 14px;
font-weight: 600;
text-transform: uppercase;
letter-spacing: 0.025em;
color: #1f2937;

/* Labels */
font-size: 12px;
font-weight: 500;
color: #4b5563;
text-transform: uppercase;
letter-spacing: 0.025em;

/* Body Text */
font-size: 13px;
font-weight: 400;
color: #1f2937;

/* Helper Text */
font-size: 12px;
font-weight: 400;
color: #6b7280;
```

---

## 3. Color Palette

### Core Colors
```
Primary Dark: #1f2937 (Gray-900) - Primary buttons, headers, main text
Secondary Gray: #4b5563 - Labels, secondary text
Light Gray: #6b7280 - Help text, disabled states
Border: #d1d5db - Borders, dividers
Light Background: #f8f9fa - Page background
Header Background: #f3f4f6 - Table headers
Row Hover: #f9fafb - Table row hover state
```

### Semantic Colors
```
Success: #10b981, #06b6d4, #84cc16, #22c55e (Emerald/Green shades)
Error: #ef4444 (Red-500)
Warning: #f59e0b (Amber-500)
Info: #2563eb (Blue-500)
Danger: #dc2626 (Red-600)
```

### Department Colors (for charts/legends)
```javascript
[
  "#3b82f6",  // Blue
  "#10b981",  // Green
  "#f59e0b",  // Amber
  "#ef4444",  // Red
  "#8b5cf6",  // Purple
  "#ec4899",  // Pink
  "#06b6d4",  // Cyan
  "#84cc16",  // Lime
  "#f97316",  // Orange
  "#6366f1",  // Indigo
  "#14b8a6",  // Teal
  "#a855f7",  // Violet
  "#22c55e",  // Green-light
  "#eab308",  // Yellow
  "#0ea5e9",  // Sky
  "#d946ef",  // Fuchsia
  "#64748b",  // Slate
  "#78716c",  // Stone
]
```

### Focus States
```
Focus Ring: 0 0 0 3px rgba(37, 99, 235, 0.1)
Focus Border: #2563eb
```

---

## 4. Space & Layout

### Padding Scale
```
xs: 4px (0.25rem)
sm: 6px (0.375rem)
md: 8px (0.5rem)
lg: 12px (0.75rem)
xl: 16px (1rem)
2xl: 24px (1.5rem)
```

### Grid System
- **Container**: Grid 2 columns for most forms (gap-4)
- **Full Width Sections**: col-span-2 for wide content
- **Table Cell Padding**: 6px 10px
- **Panel Padding**: 24px
- **Form Section Padding**: 6px 10px (inputs/selects)

---

## 5. Component Patterns

### Buttons
```css
/* Base Button */
.btn {
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 4px;
  transition: all 0.15s ease;
  cursor: pointer;
  border: 1px solid transparent;
}

/* Primary Button */
.btn-primary {
  background: #1f2937;
  color: white;
  border-color: #1f2937;

  &:hover {
    background: #111827;
  }
}

/* Secondary Button */
.btn-secondary {
  background: white;
  color: #4b5563;
  border-color: #d1d5db;

  &:hover {
    background: #f9fafb;
  }
}
```

### Form Elements
```css
input, select, textarea {
  font-family: inherit;
  font-size: 13px;
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;

  &:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  &:disabled {
    background: #f3f4f6;
    color: #6b7280;
    cursor: not-allowed;
  }
}
```

### Tables (Spreadsheet-like)
```css
.sheet-table {
  border-collapse: collapse;
  width: 100%;
  font-size: 13px;
  background: white;

  th, td {
    border: 1px solid #d1d5db;
    padding: 6px 10px;
    text-align: left;
    vertical-align: middle;
  }

  th {
    background: #f3f4f6;
    font-weight: 600;
    position: sticky;
    top: 0;
    z-index: 10;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.025em;
    color: #4b5563;
  }

  tbody tr:nth-child(even) {
    background: #fafbfc;
  }

  tbody tr:hover {
    background: #f9fafb;
  }
}
```

### Dashboard Panels
```css
.dashboard-panel {
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 24px;
  display: flex;
  flex-direction: column;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}
```

### Stat Cards
```css
.stat-card {
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-icon-container {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
}

.stat-label {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.stat-percentage {
  font-size: 11px;
  color: #9ca3af;
}
```

### Progress Bars
```css
.progress-bar {
  width: 100%;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #1f2937 0%, #4b5563 100%);
  border-radius: 3px;
  transition: width 0.3s ease;
}
```

---

## 6. Animation & Transitions

### Animations
```css
/* Slide In - Alerts */
@keyframes slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
.animate-slide-in {
  animation: slide-in 0.3s ease-out;
}

/* Scale In - Dialogs */
@keyframes scale-in {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
.animate-scale-in {
  animation: scale-in 0.2s ease-out;
}

/* Smooth Bounce In - Tooltips */
@keyframes smoothBounceIn {
  0% {
    opacity: 0;
    transform: scale(0.8) translateY(-10px);
  }
  60% {
    opacity: 1;
    transform: scale(1.02) translateY(0);
  }
  80% {
    transform: scale(0.98) translateY(0);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Dropdown Entrance */
@keyframes dropdownIn {
  from {
    opacity: 0;
    transform: translateY(-4px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

### Transition Timings
- **Fast**: 0.15s ease (button hover)
- **Normal**: 0.2s ease (dialog)
- **Moderate**: 0.3s ease (alerts, slide animations)

---

## 7. Scrollbar Styling

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

## 8. Component Library Integration

### React Icons Used
- `react-icons/fi` - Feather icons (Edit, Trash, Eye, Calendar, etc.)
- `react-icons/md` - Material Design icons (Arrow, etc.)

### Icon Sizing
- **Small**: w-4 h-4 (12px-16px)
- **Medium**: w-5 h-5 (20px)
- **Large**: w-6 h-6 (24px)

### Charts (Recharts)
Charts use the department colors array. All charts include:
- Responsive containers
- Tooltips for data display
- Legends for clarity
- Grid lines for readability
- Custom color combinations per department

---

## 9. Border Radius Scale

```
Small: 4px (inputs, buttons, small elements)
Medium: 6px (cards, dropdowns)
Large: 8px (panels, major sections)
```

---

## 10. Shadow System

```css
/* Alert/Popup Shadows */
shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1)

/* Dropdown Shadows */
shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1)
```

---

## 11. Alert Component Styling

### Success Alert
```css
bg: white
border: border-l-4 border-emerald-500
icon: Checkmark (emerald-500)
text: gray-800
```

### Error Alert
```css
bg: white
border: border-l-4 border-red-500
icon: X (red-500)
text: gray-800
```

### Warning Alert
```css
bg: white
border: border-l-4 border-amber-500
icon: Warning (amber-500)
text: gray-800
```

### Info Alert
```css
bg: white
border: border-l-4 border-blue-500
icon: Info (blue-500)
text: gray-800
```

---

## 12. Dialog/Modal Patterns

### Dark Overlay
```css
background: rgba(0, 0, 0, 0.5)
position: fixed
inset: 0
```

### Dialog Container
```css
background: white
border-radius: 8px
box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1)
animation: scale-in 0.2s ease-out
```

---

## 13. Dropdown/Select Styling

### Closed State
- Border: 1px solid #d1d5db
- Background: white
- Hover: border-gray-400
- Focus: border-black with ring-2 ring-black

### Open State
- Border: 2px solid black
- Ring: ring-2 ring-black
- Background: white with border-b

### Search Input (in dropdown)
- Border: 1px solid #e5e7eb
- Focus: border-black ring-1 ring-black

### List Item Styling
- Selected: bg-blue-50 text-blue-700 font-medium
- Hover: bg-gray-100
- Not Selected: text-gray-700

---

## 14. Form Section Layout

### Standard Form Section Structure
```html
<div class="bg-white p-6 rounded-lg border border-[#d1d5db]">
  <h3 class="text-sm font-semibold text-[#1f2937] mb-4 uppercase tracking-wide">
    Section Title
  </h3>
  <div class="grid grid-cols-2 gap-4">
    <!-- Form fields -->
  </div>
</div>
```

### Label Pattern
```html
<label class="block text-xs font-medium text-[#4b5563] mb-1">
  Field Label <span class="text-red-500">*</span>
</label>
```

---

## 15. Responsive Breakpoints

Uses Tailwind CSS default breakpoints:
```
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

Primary layout: 2-column grid that adapts responsively

---

## 16. Accessibility Features

1. **Focus States**: Blue focus ring on all interactive elements
2. **Color Contrast**: Text meets WCAG AA standards
3. **Semantic HTML**: Proper use of labels, buttons, and forms
4. **Keyboard Navigation**: All dropdowns and dialogs keyboard accessible
5. **ARIA Labels**: Used in custom components where needed

---

## 17. CSS Variables (from globals.css)

```css
:root {
  --background: #f8f9fa;
  --foreground: #1f2937;
  --border-color: #d1d5db;
  --header-bg: #f3f4f6;
  --row-hover: #f9fafb;
  --font-gabarito: [Gabarito font family];
}
```

---

## 18. Implementation Guide

### For New Projects

1. **Install Dependencies**
   ```bash
   npm install next@16.1.4 react@19.2.3 react-icons@5.5.0 recharts@3.7.0 tailwindcss@4
   ```

2. **Set up Fonts**
   - Import Gabarito in layout.tsx
   - Add to Tailwind config

3. **Copy Global Styles**
   - Use the globals.css as base
   - Import Tailwind with `@import "tailwindcss"`

4. **Component Architecture**
   - Use Tailwind utility classes primarily
   - Create component variants for reusable patterns
   - Follow naming conventions (e.g., `.btn`, `.sheet-table`, `.stat-card`)

5. **Color System**
   - Use hex colors directly in Tailwind classes: `text-[#1f2937]`
   - For dynamic colors, use CSS variables
   - Reference DEPT_COLORS array for chart colors

---

## 19. Design Principles

1. **Minimal & Professional**: Clean interface without unnecessary decoration
2. **Spreadsheet-Like**: Table-centric layout familiar to business users
3. **Efficient**: Compact spacing and typography (13px body, 6px padding)
4. **Consistent**: Unified color palette and component styling
5. **Data-Focused**: Charts and statistics prominently displayed
6. **Accessible**: Proper contrast and keyboard navigation

---

## 20. Common Patterns & Code Snippets

### Basic Panel
```jsx
<div className="bg-white p-6 rounded-lg border border-[#d1d5db]">
  <h3 className="text-sm font-semibold text-[#1f2937] mb-4 uppercase tracking-wide">
    Title
  </h3>
  {/* Content */}
</div>
```

### Stat Card with Icon
```jsx
<div className="stat-card">
  <div className="stat-icon-container bg-blue-50">
    <GrIcon className="stat-icon text-blue-600" />
  </div>
  <div className="stat-value">123</div>
  <div className="stat-label">Label</div>
</div>
```

### Form Field
```jsx
<div>
  <label className="block text-xs font-medium text-[#4b5563] mb-1">
    Label
  </label>
  <input
    type="text"
    className="w-full"
    placeholder="Placeholder"
  />
</div>
```

### Alert Notification
```jsx
<div className="fixed top-4 right-4 z-50 animate-slide-in">
  <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded shadow-lg">
    {/* Alert content */}
  </div>
</div>
```

---

## 21. File Structure Reference

```
project-root/
├── app/
│   ├── globals.css              # Global styles & CSS variables
│   ├── layout.tsx               # Root layout with font setup
│   └── [pages]/
├── components/
│   ├── EMoUForm.tsx            # Complex form example
│   ├── SheetsTable.tsx          # Table component
│   ├── Alert.tsx                # Alert component
│   ├── ConfirmDialog.tsx        # Dialog component
│   └── [other components]/
└── postcss.config.mjs           # PostCSS configuration
```

---

## 22. Maintenance Notes

- **Font**: Gabarito is imported from Google Fonts (hosted)
- **Color Consistency**: Use CSS classes and variables systematically
- **Responsive Design**: Mobile-first approach with Tailwind utilities
- **Dark Mode**: Currently not implemented, can be added via Tailwind dark: variant
- **Browser Support**: Modern browsers (Chrome, Firefox, Safari, Edge)

---

**Last Updated**: April 2026
**Version**: 1.0
**Framework**: Next.js 16.1.4, React 19.2.3, Tailwind CSS 4.0
