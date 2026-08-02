# UI refactor inventory

## Phase 0 baseline

- Audited: `README.md`, all files in `docs/`, `package.json`,
  `components.json`, `tsconfig.json`, `src/app/globals.css`, the complete
  component tree, shared types, demo data, and the application entry points.
- Initial working tree: clean on `agent/pro-team-urs`.
- Initial verification: `npm run typecheck` passed.
- Runtime baseline: database-backed Manager session at `http://127.0.0.1:8000`.
- CSS baseline: 5,201 lines, 325 unique class selectors, six responsive
  thresholds, four global keyframes, and seven custom `shadcn-*` primitive
  families.
- Component baseline: `task-manager.tsx` 3,759 lines; lower-level view and
  dialog functions were nested in the controller component.
- Baseline captures: `/private/tmp/pro-team-ui-baseline/before`.

The baseline set contains login light/dark, workspace light/dark, workspace
mobile light/dark, task/project/team dialogs, workspace switcher, notification
popover, and list/board/calendar/timeline/dashboard views. Captures use the
repository-owned `scripts/capture-ui.mjs` workflow.

## Interaction and role baseline

| Area | Baseline behavior |
|---|---|
| Authentication | Login, signup tab, demo identity selection, remember-me, password visibility, logout |
| Workspace | Session restore, workspace persistence/switch/create, desktop and mobile sidebar, theme persistence |
| Projects | Create/edit, membership, archive/restore, guarded permanent delete, project-scoped columns |
| Tasks | Create/edit, inline updates, assignees, subtasks, dependencies, recurrence, archive/restore/delete |
| Views | Grouped list, draggable board, month calendar, timeline, dashboard |
| Filters | Global/project search, status, priority, assignee, due date, tags, clear, CSV |
| Collaboration | Comments, mentions, attachments, activity, notifications, mark-read |
| RBAC | Admin, Manager, Member, Guest, Viewer controls match `permissions.ts` and server enforcement |
| Persistence | Database mode first; existing local-storage fallback remains unchanged |

## Migration map

| Current selector/component | Current responsibility | Shadcn replacement | Atomic level | Destination file | Migration status |
|---|---|---|---|---|---|
| `.shadcn-button`, `.primary-button`, `.secondary-button`, `.icon-button` | Buttons and repeated actions | `Button` + `cva` wrappers | UI primitive / atom | `ui/button.tsx`, `atoms/icon-button.tsx` | Migrated |
| `.shadcn-input`, text inputs | Text entry | `Input` | UI primitive | `ui/input.tsx` | Migrated |
| `.shadcn-label`, form labels | Accessible labels | `Label` | UI primitive | `ui/label.tsx` | Migrated |
| `.shadcn-checkbox`, `.custom-checkbox` | Boolean input | `Checkbox` | UI primitive | `ui/checkbox.tsx` | Migrated |
| `.shadcn-card`, `.metric-card`, `.dashboard-card` | Panels and metrics | `Card` | UI primitive / molecule | `ui/card.tsx`, `molecules/metric-card.tsx` | Migrated |
| `.shadcn-tabs-*`, `.view-tabs`, `.collaboration-tabs` | Auth, view, collaboration tabs | `Tabs` | UI primitive / organism | `ui/tabs.tsx`, `organisms/task-toolbar.tsx`, `organisms/task-collaboration.tsx` | Migrated |
| `.shadcn-alert`, `.login-error`, `.collaboration-error`, `.toast` | Inline and transient feedback | `Alert` | UI primitive / feature composition | `ui/alert.tsx`, auth/collaboration/task-manager compositions | Migrated |
| `.login-*`, `.auth-*`, `.demo-*` | Authentication layout and forms | Card/Input/Label/Tabs/Checkbox/Alert | Template / feature composition | `templates/auth-layout.tsx`, `auth/login-screen.tsx` | Migrated |
| `.brand-icon`, `.login-brand`, `.login-mobile-mark` | Product mark | source-owned wrapper | Atom | `atoms/brand-logo.tsx` | Migrated |
| `.avatar-*` | User identity and tone | `Avatar` + domain `cva` wrapper | UI primitive / atom | `ui/avatar.tsx`, `atoms/user-avatar.tsx` | Migrated |
| `.project-mark` | Runtime project color | domain wrapper | Atom | `atoms/project-mark.tsx` | Migrated |
| `.status-*`, `.priority-*`, `.role-badge` | Semantic state badges | `Badge` + `cva` | Atom | `atoms/status-badge.tsx`, `atoms/priority-badge.tsx` | Migrated |
| Native task-status select | Direct task status editing | `Popover` + accessible status tile grid | Molecule | `molecules/status-select.tsx`, consumed by task list/dialog | Migrated |
| `.sync-indicator` | Persistence state | `Badge` composition | Atom | `atoms/sync-indicator.tsx` | Migrated |
| `.app-shell`, `.main-area`, `.workspace-content` | Application frame | composition | Template | `templates/workspace-shell.tsx` | Migrated |
| `.sidebar`, `.nav-*`, `.sidebar-*`, `.invite-*` | Desktop/mobile navigation | `Sheet`, `ScrollArea`, `Separator`, `Tooltip` | Organism | `organisms/app-sidebar.tsx` | Migrated |
| `.topbar`, `.topbar-actions` | Global header actions | Button/Tooltip composition | Organism | `organisms/app-topbar.tsx` | Migrated |
| `.workspace-switcher`, `.workspace-menu`, `.workspace-create` | Workspace selection/create | `Popover`, `Input` | Molecule | `molecules/workspace-switcher.tsx` | Migrated |
| Project row context actions | Open, edit, and archive project within RBAC | `DropdownMenu` | Molecule / organism | `molecules/project-actions-menu.tsx`, `organisms/app-sidebar.tsx` | Migrated |
| `.role-switcher`, `.role-menu`, `.account-summary` | Account and role actions | `DropdownMenu` | Feature molecule | `workspace/role-switcher.tsx` | Migrated |
| `.global-search`, `.toolbar-search` | Search controls | `Input` composition | Molecule | `molecules/global-search.tsx` | Migrated |
| `.filter-control`, native toolbar selects, `.clear-filters`, `.add-column-button` | Workspace filtering/actions | `Select`, `Button`, `Tabs` | Molecule / organism | `molecules/filter-select.tsx`, `organisms/task-toolbar.tsx` | Migrated |
| `.metrics-grid`, `.metric-*` | Summary metrics | `Card`, `Progress` | Molecule / feature composition | `molecules/metric-card.tsx`, `task-manager.tsx` | Migrated |
| `.list-*`, `.task-table-*`, `.task-row`, `.group-*` | Nested task list | `Collapsible`, `Checkbox`; CSS grid retained for nested-row parity | Organism | `organisms/task-list.tsx` | Migrated |
| `.assignee-*`, `.modal-assignee-grid` | Multi-person selection | accessible button/Avatar composition | Molecule | `molecules/assignee-picker.tsx`, `molecules/task-assignee-field.tsx` | Migrated |
| `.custom-cell*`, native person/status/dropdown controls, `.custom-progress*`, `.mini-progress` | Typed custom cells | Input/Select/Checkbox/Slider/Progress | Feature component | `features/task-manager/components/custom-cell.tsx` | Migrated |
| `.board-*` | Kanban columns/cards | `Card`, `ScrollArea` | Organism | `organisms/task-board.tsx` | Migrated |
| `.calendar-*` | Month navigation and task dates | `Button`, `Card` composition | Organism | `organisms/task-calendar.tsx` | Migrated |
| `.timeline-*` | Runtime timeline geometry | `ScrollArea`; custom geometry retained | Organism | `organisms/task-timeline.tsx` | Migrated |
| `.dashboard-*`, `.chart-*`, `.priority-donut`, `.workload-*` | Dashboard charts | `Card`; custom geometry retained | Organism | `organisms/task-dashboard.tsx` | Migrated |
| `.modal-backdrop`, `.task-modal`, `.modal-*` | Task and column forms | `Dialog`, `Input`, `Textarea`, `Select`, `Slider`, `AlertDialog` | Organism | `organisms/task-dialog.tsx`, `organisms/column-dialog.tsx` | Migrated |
| `.project-modal*`, `.project-color-grid`, `.project-member-grid` | Project lifecycle form | `Dialog`, form primitives, `AlertDialog` | Organism | `organisms/project-dialog.tsx` | Migrated |
| `.team-modal*`, `.team-user-*`, `.role-select` | Team and roles | `Dialog`, `Select`, `AlertDialog` | Organism | `organisms/team-dialog.tsx` | Migrated |
| `.notification-*` | Notification trigger/popover/list | `Popover`, `ScrollArea`, `Button` | Organism | `organisms/notification-center.tsx` | Migrated |
| `.task-collaboration`, `.comment-*`, `.attachment-*`, `.task-activity-*` | Comments, files, activity | `Tabs`, `ScrollArea`, `Textarea`, `Button` | Organism | `organisms/task-collaboration.tsx` | Migrated |
| `.activity-panel`, `.activity-*` | Workspace activity drawer | `Sheet`, `ScrollArea` | Organism | `organisms/activity-panel.tsx` | Migrated |
| `.empty-state`, `.empty-column`, `.collaboration-empty` | Empty feedback | reusable empty composition | Molecule | `molecules/empty-state.tsx` | Migrated |
| `.spin`, `.auth-spinner`, loading selectors | Busy feedback | local accessible spinner utility | Feature composition | auth and task-manager compositions | Migrated |

## Dynamic style exceptions

Inline styles are retained only for project color, calculated table columns,
task/chart progress, timeline coordinates, and conic-gradient chart segments.
These are runtime values and cannot be expressed as a static Tailwind class
without dynamic class construction.

## Completion evidence

- Final `globals.css`: 261 lines, with imports, tokens, base reset, theme sync
  support, and reduced-motion handling only.
- Component-specific global selectors: 0.
- Legacy `shadcn-*`, `.primary-button`, `.task-modal`, and `.nav-item`
  selectors/usages: 0.
- `task-manager.tsx`: reduced from 3,759 to 371 lines and limited to
  controller consumption plus page composition.
- Final captures: `/private/tmp/pro-team-ui-baseline/after`.
- Automated browser smoke: 28 checks covering auth modes, theme sync,
  menus/popovers, all workspace views, dialog focus/escape, accessible button
  names, responsive overflow, mobile navigation, and logout.
