# Pro Team design system

The design system preserves the existing Pro Team interface. It is an
architecture and styling contract, not a redesign. Runtime code consumes
semantic tokens; the canonical brand value is defined once in
`src/app/globals.css`.

## Brand

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--brand` | `#7257F5` | `#8B73FF` | Primary actions, active navigation, focus identity |
| `--brand-foreground` | `#FFFFFF` | `#FFFFFF` | Content on solid brand |
| `--brand-hover` | `#5C40DF` | `#745BF0` | Hover/pressed action |
| `--brand-subtle` | `#EEEAFF` | `rgba(123, 94, 255, 0.15)` | Selected and low-emphasis brand surfaces |
| `--brand-ring` | translucent brand | translucent brand | Focus halo |

`--primary` and `--ring` alias `--brand`; components never duplicate the
canonical brand hex value.

Supporting visual-parity tokens (`--brand-highlight`,
`--brand-hero-start|middle|end`, `--login-accent`,
`--workspace-logo-start|end|foreground`) keep legacy gradients and
illustrative accents centralized without redefining the canonical action
color in JSX.

## Semantic colors

Shadcn-compatible tokens are `--background`, `--foreground`, `--card`,
`--card-foreground`, `--popover`, `--popover-foreground`, `--primary`,
`--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`,
`--muted-foreground`, `--accent`, `--accent-foreground`, `--destructive`,
`--destructive-foreground`, `--border`, `--input`, and `--ring`.

Application tokens are `--success`, `--warning`, `--danger`, `--info`,
`--surface`, `--surface-raised`, `--surface-soft`, `--surface-hover`,
`--sidebar`, `--sidebar-foreground`, `--sidebar-border`, `--sidebar-hover`,
and `--sidebar-active`.

Status and priority colors remain independent from brand:

- success/completed: `--success`
- caution and medium priority: `--warning`
- destructive, overdue, and critical: `--danger`
- informational/in-progress: `--info`
- task-status picker tiles: `--status-not-started`, `--status-working`,
  `--status-review`, `--status-done`
- priority scale: `--priority-low`, `--priority-medium`, `--priority-high`,
  `--priority-critical`

## Typography

- UI/body: DM Sans, `14px` global baseline.
- Display/headings: Manrope through `font-heading`.
- Existing compact application labels use explicit `8–12px` utilities for
  visual parity.
- Weight is semantic: 400 body, 500 supportive controls, 600 actions,
  700 labels/headings, 800 brand/display.

## Spacing

Tailwind's 4px spacing scale is the default. Existing geometry that falls
between scale steps uses a documented arbitrary value at the component call
site. Repeated spacing belongs in a component or `cva` variant, not a global
selector.

## Radius

| Token | Value | Typical usage |
|---|---:|---|
| `--radius-sm` | 6px | compact labels and chips |
| `--radius-md` | 8px | controls |
| `--radius-lg` | 11px | navigation and compact panels |
| `--radius-xl` | 13px | cards and dialogs |
| full | 9999px | avatars, status dots, progress |

## Shadows

- `shadow-panel` / `--shadow`: cards and floating controls.
- `shadow-overlay` / `--shadow-lg`: menus, popovers, dialogs.
- Brand buttons may use a local brand-tinted shadow when required by the
  baseline.

## Breakpoints

| Tailwind token | Width | Existing responsibility |
|---|---:|---|
| `shell` | 1180px | toolbar/list density and layout |
| `auth` | 980px | authentication columns |
| `tablet` | 900px | desktop sidebar transition |
| `mobile` | 760px | single-column auth/dashboard/dialog content |
| `nav` | 700px | mobile workspace controls/popovers |
| `compact` | 420px | narrow-phone control stacking |

Prefer the named token variants. An arbitrary breakpoint is allowed only while
the corresponding vertical slice is still under parity migration.

## Z-index layers

| Layer | Value |
|---|---:|
| sticky sidebar/topbar | 40 |
| mobile backdrop | 45 |
| mobile sidebar / sheet | 50 |
| menus, popovers, pickers | 80 |
| activity panel | 90 |
| dialog overlay/content | 100 |
| toast and critical feedback | 120 |

Portalled shadcn content follows the same ordering through local `z-*`
utilities. Primitive defaults stay source-owned; feature compositions promote
menus, activity surfaces, and transient feedback only when the legacy stacking
contract requires it.

## Component variant rules

- `src/components/ui` contains only source-owned shadcn primitives.
- Domain-aware wrappers live in `atoms` or `molecules`.
- Repeated variants use `cva`; conditional class composition uses `cn`.
- Brand is a semantic `primary`/`brand` variant, never a duplicated hex.
- Destructive actions use the destructive token and require confirmation for
  irreversible operations.
- Icon-only controls use `IconButton` and must provide an accessible name.
- Select menus use a neutral selected/highlighted surface with a trailing
  checkmark; status and priority colors remain on their closed domain wrappers.
- Static styling uses Tailwind classes. Inline styles are limited to runtime
  project colors, calculated progress, table/timeline geometry, and chart
  gradients.
- Dynamic Tailwind class-name construction is prohibited.

## Theme behavior

The storage key remains `nimbus-theme`. On initialization and every toggle, the
root element receives both `data-theme="light|dark"` and a synchronized `.dark`
class. Existing CSS-variable behavior and shadcn's `dark:` variant therefore
share one state. The browser `color-scheme` follows the active theme.

Focus uses the brand-backed `--ring` token. Reduced-motion preferences disable
nonessential animation while leaving state changes and focus feedback intact.

## Global CSS boundary

`src/app/globals.css` is limited to Tailwind/shadcn imports, theme and
compatibility variables, font setup, the minimal base reset, the custom dark
variant, and reduced-motion handling. It contains no component selector or
`@apply` block. The temporary-looking aliases such as `--text-soft` and
`--line-strong` are token aliases consumed from utilities; they are retained to
preserve the original palette during the migration and are not a hidden
component stylesheet.
