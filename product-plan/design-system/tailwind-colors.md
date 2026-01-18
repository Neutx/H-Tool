# Tailwind Color Configuration

## Color Choices

- **Primary:** `emerald` — Used for buttons, links, key accents, success states
- **Secondary:** `amber` — Used for tags, highlights, secondary elements, warnings
- **Neutral:** `slate` — Used for backgrounds, text, borders

## Usage Examples

**Primary button:**
```tsx
className="bg-emerald-600 hover:bg-emerald-700 text-white"
```

**Secondary badge:**
```tsx
className="bg-amber-100 text-amber-800"
```

**Neutral text:**
```tsx
className="text-slate-600 dark:text-slate-400"
```

**Success state:**
```tsx
className="text-emerald-600 dark:text-emerald-400"
```

**Warning state:**
```tsx
className="text-amber-600 dark:text-amber-400"
```

## Dark Mode

All components support dark mode using Tailwind's `dark:` prefix. Use `dark:` variants for all colors to ensure proper contrast in both light and dark themes.


