# Reforge Frontend Style Guide

**Goal:** Maintain a consistent "Self-Hosted Engineering Tool" aesthetic.
**Vibe:** Professional, Offline-first, High-Performance, "System Online", Terminal-adjacent.
**Anti-Patterns:** Generic SaaS marketing, "Friendly/Playful" UI, overly rounded "Web 2.0" styles, bright/white-dominant interfaces.

---

## 1. Core Color Palette ("Base16 Nerdy Linux")
We use a custom **OKLCH** palette inspired by **Nord** and **Tokyo Night**.

### Dark Mode (Primary)
- **Background:** `oklch(0.14 0.04 261.692)` (Deep Nord Blue-Grey)
- **Surface/Card:** `oklch(0.16 0.04 261.692)` (Slightly lighter surface)
- **Primary Accent:** `oklch(0.60 0.18 250)` (Electric Cyber Blue)
- **Secondary Accent:** `oklch(0.20 0.05 261.692)` (Muted Blue-Grey)
- **Text:** `oklch(0.90 0.02 247.839)` (Soft Ice White - never pure white)

### Light Mode (Secondary/Utility)
- **Background:** `oklch(0.96 0.01 247.839)` (Solarized/Nord Light)
- **Text:** `oklch(0.20 0.03 261.692)` (Deep Slate)
- **Primary:** `oklch(0.48 0.18 261.692)` (Deep Nerdy Blue)

### Status Colors
- **Success/Online:** `text-green-500` / `bg-green-500` (Terminal Green)
- **Warning/Pending:** `text-orange-400` / `bg-orange-400`
- **Error/Offline:** `text-red-500` / `bg-red-500`

---

## 2. Typography & Iconography
- **Font Family:** System Sans-Serif (Inter/Geist equivalent) for UI.
- **Monospace:** Use lavishly for:
    - Version numbers (`v1.0.0`)
    - Status indicators (`System Online`)
    - Data values (`Retention: 98%`)
    - Code snippets
- **Icons:** Use **Lucide React**.
    - Preferred style: `h-4 w-4` or `h-5 w-5`.
    - Use technical icons: `Terminal`, `Cpu`, `Server`, `Shield`, `Network`, `GitBranch`.

---

## 3. UI Patterns & Components

### The "System Status" Aesthetic
Instead of "Welcome Back, User", prefer "Console Active" or "System Ready".
UI elements should feel like a heads-up display (HUD).

**Do:**
- Use thin borders (`border border-border`).
- Use subtle glow effects (`hover:shadow-[0_0_15px_-3px_var(--primary)]`).
- Use "pills" for metadata (rounded-md, monospace text).
- Use vector-style illustrations (minimalist lines, nodes, networks).

**Don't:**
- Use massive drop shadows (use glows/borders instead).
- Use "blob" shapes or "organic" curves.
- Use 3D illustrations.

### Buttons & Inputs
- **Base:** Standard Shadcn UI components.
- **Overriden Styles:**
    - `rounded-md` (Avoid `rounded-full` unless for specific status pills).
    - `border-input` should be visible but subtle.
    - Hover states should feel "crisp" (quick transitions).

---

## 4. Animation Guidelines (Framer Motion)
- **Type:** "Technical" entrances.
- **Presets:**
    - Slide content in from bottom (`y: 20 -> y: 0`).
    - Fade opacity (`0 -> 1`).
    - Stagger children elements.
- **Speed:** Fast. `duration: 0.3` to `0.5`. No slow, dreamy floats.

---

## 5. CSS Variables Reference (Tailwind)
Ensure new components use these semantic variables:
- `bg-background` / `text-foreground`
- `border-border`
- `ring-ring` (for focus states)
- `bg-primary` / `text-primary-foreground` (for primary actions)
- `bg-muted` / `text-muted-foreground` (for secondary text/backgrounds)

---

> **Prompt Injection Template:**
> "I am working on the Reforge frontend. Please strictly adhere to `STYLE-GUIDE.md`. Maintain the 'Nerdy Linux' / 'Private Cloud' aesthetic. Do not introduce generic SaaS styles."
