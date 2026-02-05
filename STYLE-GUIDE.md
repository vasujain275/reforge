# Reforge Design System

**Philosophy:** Clean, focused, professional. Help users concentrate on learning without distractions.

**Design Principles:**
1. **Clarity over cleverness** — Every element should have a clear purpose
2. **Consistent spacing** — Use the 8px grid system
3. **Subtle depth** — Shadows over glows, restraint over decoration
4. **Accessible first** — High contrast, readable typography, keyboard navigation

**Anti-Patterns:**
- Overly decorated interfaces with unnecessary visual effects
- Glow effects and neon aesthetics
- Terminal/CLI mockups in user-facing UI
- Crowded layouts with too much information density
- Generic SaaS marketing language

---

## 1. Color Palette

We use OKLCH colors for perceptually uniform color mixing and better accessibility.

### Dark Mode (Primary)

Dark mode is the primary experience. Design for dark first.

```css
:root {
  /* Backgrounds - True neutrals, minimal blue tint */
  --background: oklch(0.13 0.005 260);           /* #141417 - Primary background */
  --background-secondary: oklch(0.16 0.008 260); /* #1c1c21 - Cards, surfaces */
  --background-tertiary: oklch(0.20 0.008 260);  /* #27272c - Elevated elements, hover states */
  
  /* Foreground */
  --foreground: oklch(0.95 0.005 260);           /* #f0f0f2 - Primary text */
  --foreground-muted: oklch(0.65 0.01 260);      /* #9898a0 - Secondary text, labels */
  --foreground-subtle: oklch(0.45 0.01 260);     /* #606068 - Tertiary text, placeholders */
  
  /* Primary Accent - Soft Indigo */
  --primary: oklch(0.60 0.15 270);               /* #6366f1 - Primary actions, links */
  --primary-hover: oklch(0.55 0.15 270);         /* Darker on hover */
  --primary-foreground: oklch(0.98 0.005 260);   /* Text on primary bg */
  
  /* Secondary - Muted purple-grey */
  --secondary: oklch(0.22 0.02 270);
  --secondary-hover: oklch(0.25 0.02 270);
  --secondary-foreground: oklch(0.90 0.01 260);
  
  /* Borders */
  --border: oklch(0.25 0.008 260);               /* Default borders */
  --border-subtle: oklch(0.20 0.005 260);        /* Subtle separators */
  --border-focus: oklch(0.55 0.15 270);          /* Focus rings */
  
  /* Status Colors */
  --success: oklch(0.65 0.18 145);               /* #22c55e - Green */
  --success-bg: oklch(0.25 0.05 145);            /* Green background tint */
  --warning: oklch(0.70 0.15 75);                /* #f59e0b - Amber */
  --warning-bg: oklch(0.25 0.05 75);
  --destructive: oklch(0.55 0.20 25);            /* #ef4444 - Red */
  --destructive-bg: oklch(0.25 0.05 25);
  
  /* Difficulty Colors */
  --difficulty-easy: oklch(0.65 0.18 145);       /* Green */
  --difficulty-medium: oklch(0.70 0.15 75);      /* Amber */
  --difficulty-hard: oklch(0.55 0.20 25);        /* Red */
}
```

### Light Mode

```css
.light {
  --background: oklch(0.985 0.003 260);          /* Near white */
  --background-secondary: oklch(0.97 0.003 260); /* Slightly grey */
  --background-tertiary: oklch(0.94 0.003 260);
  
  --foreground: oklch(0.15 0.01 260);            /* Near black */
  --foreground-muted: oklch(0.45 0.01 260);
  --foreground-subtle: oklch(0.60 0.01 260);
  
  --primary: oklch(0.50 0.18 270);               /* Darker indigo for contrast */
  --primary-hover: oklch(0.45 0.18 270);
  
  --border: oklch(0.88 0.005 260);
  --border-subtle: oklch(0.92 0.003 260);
}
```

---

## 2. Typography

### Font Families

```css
:root {
  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
}
```

### When to Use Monospace

Use `font-mono` sparingly, only for:
- Problem IDs and identifiers
- Score values (e.g., "0.78")
- Time durations (e.g., "12:34")
- Version numbers (e.g., "v2.1.0")
- Code snippets
- Technical values in tables

**Do NOT use monospace for:**
- Navigation labels
- Button text
- Headings
- Body text
- Status messages

### Type Scale

| Name | Size | Weight | Use |
|------|------|--------|-----|
| `text-xs` | 12px | 400 | Tertiary labels, metadata |
| `text-sm` | 14px | 400 | Secondary text, table content |
| `text-base` | 16px | 400 | Body text, form inputs |
| `text-lg` | 18px | 500 | Subheadings, card titles |
| `text-xl` | 20px | 600 | Section headings |
| `text-2xl` | 24px | 600 | Page titles |
| `text-3xl` | 30px | 700 | Hero headings |

---

## 3. Spacing & Layout

### 8px Grid System

All spacing should be multiples of 8px:
- `8px` (2) - Tight spacing within components
- `16px` (4) - Standard padding, gaps between elements
- `24px` (6) - Section padding
- `32px` (8) - Large gaps between sections
- `48px` (12) - Page-level spacing
- `64px` (16) - Hero sections

### Container Widths

```css
.container-sm { max-width: 640px; }   /* Forms, auth pages */
.container-md { max-width: 768px; }   /* Content pages */
.container-lg { max-width: 1024px; }  /* Dashboard content */
.container-xl { max-width: 1280px; }  /* Full layouts */
```

### Page Structure

```
┌──────────────────────────────────────────────────────────────┐
│ Sidebar (256px fixed)  │  Main Content (flex-1)             │
│                        │                                     │
│ - Logo                 │  ┌─ Page Header ──────────────────┐│
│ - Navigation           │  │ Title + Actions                ││
│ - User Profile         │  └─────────────────────────────────┘│
│                        │                                     │
│                        │  ┌─ Content ───────────────────────┐│
│                        │  │ Cards, Tables, Forms            ││
│                        │  │ (max-width: 1024px for comfort) ││
│                        │  └─────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

---

## 4. Components

### Buttons

**Variants:**
- `primary` - Main actions (Save, Submit, Start Session)
- `secondary` - Secondary actions (Cancel, Back)
- `ghost` - Tertiary actions, inline buttons
- `destructive` - Delete, dangerous actions

**Sizes:**
- `sm` - 32px height, tight padding
- `default` - 40px height, standard
- `lg` - 48px height, prominent CTAs

**States:**
```css
.button-primary {
  background: var(--primary);
  color: var(--primary-foreground);
  border-radius: 6px;
  transition: background 0.15s ease;
}

.button-primary:hover {
  background: var(--primary-hover);
}

.button-primary:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
}

/* NO glow effects on hover */
```

### Cards

```css
.card {
  background: var(--background-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 24px;
}

/* Subtle shadow for elevation, NOT glow */
.card-elevated {
  box-shadow: 0 1px 3px oklch(0 0 0 / 0.2), 
              0 4px 8px oklch(0 0 0 / 0.1);
}
```

### Badges

Less pill-shaped, more subtle:

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;       /* Not fully rounded */
  font-size: 12px;
  font-weight: 500;
}

/* Difficulty badges */
.badge-easy {
  background: var(--success-bg);
  color: var(--success);
}

.badge-medium {
  background: var(--warning-bg);
  color: var(--warning);
}

.badge-hard {
  background: var(--destructive-bg);
  color: var(--destructive);
}
```

### Tables

```css
.table {
  width: 100%;
  border-collapse: collapse;
}

.table th {
  text-align: left;
  font-weight: 500;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--foreground-muted);
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.table td {
  padding: 16px;
  border-bottom: 1px solid var(--border-subtle);
}

.table tr:hover {
  background: var(--background-tertiary);
}
```

### Form Inputs

```css
.input {
  height: 40px;
  padding: 0 12px;
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.15s ease;
}

.input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px oklch(0.60 0.15 270 / 0.15);
}

.input::placeholder {
  color: var(--foreground-subtle);
}
```

---

## 5. Shadows

Use shadows for depth, never glows.

```css
:root {
  --shadow-xs: 0 1px 2px oklch(0 0 0 / 0.2);
  --shadow-sm: 0 1px 3px oklch(0 0 0 / 0.2), 
               0 1px 2px oklch(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px oklch(0 0 0 / 0.15), 
               0 2px 4px oklch(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px oklch(0 0 0 / 0.15), 
               0 4px 6px oklch(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px oklch(0 0 0 / 0.15), 
               0 8px 10px oklch(0 0 0 / 0.1);
}
```

**Never use:**
```css
/* DON'T */
box-shadow: 0 0 15px -3px var(--primary);  /* Glow effect */
box-shadow: 0 0 20px oklch(0.60 0.15 270 / 0.5);  /* Colored glow */
```

---

## 6. Icons

Use **Lucide React** for all icons.

### Sizes
- `16px` (w-4 h-4) - Inline with text, buttons
- `20px` (w-5 h-5) - Standalone, navigation
- `24px` (w-6 h-6) - Large, emphasis

### Preferred Icons by Context

| Context | Icon | NOT |
|---------|------|-----|
| Dashboard | `LayoutDashboard` | `Terminal` |
| Problems | `BookOpen`, `FileText` | `Terminal` |
| Sessions | `Clock`, `Play` | `Cpu` |
| Patterns | `Layers`, `Grid` | `Network` |
| Settings | `Settings`, `Sliders` | `Terminal`, `Server` |
| User | `User`, `CircleUser` | |
| Add | `Plus` | |
| Edit | `Pencil` | |
| Delete | `Trash2` | |
| External link | `ExternalLink` | |
| Success | `Check`, `CheckCircle` | |
| Warning | `AlertTriangle` | |
| Error | `XCircle`, `AlertCircle` | |
| Info | `Info` | |

### Icon Usage

```tsx
import { LayoutDashboard, BookOpen, Clock } from 'lucide-react';

// In navigation
<LayoutDashboard className="w-5 h-5" />

// In buttons (left of text)
<Button>
  <Plus className="w-4 h-4 mr-2" />
  Add Problem
</Button>
```

---

## 7. Animation

### Principles
- **Fast transitions** - 150-200ms for interactions
- **Subtle movement** - No dramatic entrances
- **Purpose-driven** - Only animate to provide feedback or guide attention

### Standard Transitions

```css
/* Micro-interactions */
.transition-colors {
  transition: color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease;
}

.transition-opacity {
  transition: opacity 0.15s ease;
}

/* Page transitions */
.transition-fade {
  transition: opacity 0.2s ease;
}

.transition-slide {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
```

### Framer Motion Presets

```tsx
// Fade in
const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.2 }
};

// Slide up
const slideUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25 }
};

// Stagger children
const stagger = {
  animate: { transition: { staggerChildren: 0.05 } }
};
```

**Never use:**
- Duration > 0.4s for UI transitions
- Spring animations with high bounce
- Complex sequences for simple actions

---

## 8. Copy & Language

### Voice & Tone
- **Clear and direct** - No jargon unless necessary
- **Helpful** - Guide users through actions
- **Professional** - Not casual/playful, not corporate/stiff
- **Encouraging** - Celebrate progress without being patronizing

### Standard Labels

| Old (Remove) | New |
|--------------|-----|
| Console | Dashboard |
| Config | Settings |
| Access Console | Sign In |
| Initialize System | Get Started / Create Account |
| System Active | (Remove) |
| Launch Console | Go to Dashboard |
| Initializing... | Loading... |
| $ reforge ... | (Remove CLI prompts) |

### Empty States

Provide helpful empty states with clear next actions:

```tsx
// Good
<EmptyState
  icon={<BookOpen className="w-12 h-12 text-muted-foreground" />}
  title="No problems yet"
  description="Add your first problem to start tracking your progress."
  action={<Button>Add Problem</Button>}
/>

// Avoid
<div>No data</div>
<div>Initializing console...</div>
```

### Error Messages

Be specific and actionable:

```tsx
// Good
"Unable to save changes. Please check your connection and try again."
"Password must be at least 8 characters."

// Avoid
"Error occurred"
"Invalid input"
```

---

## 9. Accessibility

### Color Contrast
- All text meets WCAG AA (4.5:1 for normal text, 3:1 for large text)
- Interactive elements have visible focus states
- Don't rely on color alone to convey meaning

### Focus States
```css
/* Visible focus ring */
:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* Don't remove outlines */
:focus {
  outline: none; /* Only if providing alternative */
}
```

### Keyboard Navigation
- All interactive elements are keyboard accessible
- Logical tab order
- Escape closes modals and dropdowns
- Arrow keys for navigation within components

### Screen Readers
- Use semantic HTML (button, nav, main, etc.)
- Provide alt text for images
- Use aria-labels for icon-only buttons
- Announce dynamic content changes

---

## 10. Responsive Design

### Breakpoints

```css
/* Mobile first approach */
sm: 640px   /* Small tablets */
md: 768px   /* Tablets */
lg: 1024px  /* Laptops */
xl: 1280px  /* Desktops */
2xl: 1536px /* Large screens */
```

### Mobile Considerations
- Sidebar collapses to hamburger menu below `lg`
- Tables become cards on mobile
- Touch targets minimum 44px
- Reduce padding on mobile (16px instead of 24px)

---

## 11. Do's and Don'ts

### Do

- Use consistent spacing (8px grid)
- Provide clear visual hierarchy
- Use shadows for depth
- Keep interfaces clean and focused
- Use status colors meaningfully
- Write helpful error messages
- Test with keyboard navigation

### Don't

- Use glow effects or neon aesthetics
- Include CLI/terminal mockups in UI
- Use monospace for everything
- Overload pages with information
- Use vague or cute error messages
- Skip focus states
- Rely on color alone for meaning

---

## 12. Example: Before & After

### Navigation Item

**Before (Old Style):**
```tsx
<button className="flex items-center gap-2 px-3 py-2 rounded-md 
  hover:bg-secondary hover:shadow-[0_0_15px_-3px_var(--primary)]
  text-muted-foreground hover:text-foreground transition-all">
  <Terminal className="h-4 w-4" />
  <span className="font-mono">Console</span>
</button>
```

**After (New Style):**
```tsx
<button className="flex items-center gap-3 px-3 py-2 rounded-md 
  hover:bg-background-tertiary
  text-muted-foreground hover:text-foreground transition-colors">
  <LayoutDashboard className="w-5 h-5" />
  <span>Dashboard</span>
</button>
```

### Status Indicator

**Before:**
```tsx
<div className="flex items-center gap-2 font-mono text-sm">
  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
  System Active
</div>
```

**After:**
```tsx
// Simply remove status indicators that don't provide value
// Or if needed:
<div className="flex items-center gap-2 text-sm text-muted-foreground">
  <CheckCircle className="w-4 h-4 text-success" />
  Connected
</div>
```

---

*This style guide is a living document. Update as the design system evolves.*
