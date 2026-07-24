# Nimbus functional requirements

## Workspace and users

- A workspace has active and inactive users.
- Visitors can create a member account, log in, restore an active session, and
  log out.
- Passwords are never stored in plaintext and browser sessions use HttpOnly
  cookies.
- Each user has one role: Admin, Manager, Member, or Viewer.
- Admins can add members, change roles, and deactivate accounts.
- The final active admin cannot remove their own admin access.
- Tasks can be assigned to one or more active workspace users.
- My Work shows active tasks assigned to the current user.

## Projects

- A workspace can contain any number of projects.
- Admins and managers can create and edit projects.
- Every project has a name, color, description, owner, lifecycle state, and
  ordered member list.
- Active projects appear in the sidebar from the database; no project is
  hard-coded in the UI.
- Projects can be archived and restored without deleting their tasks.
- Only admins can permanently delete an empty archived project.
- Project members inherit workspace read access; task mutation still follows the
  workspace role matrix.
- Custom columns belong to one project and do not leak into other projects.
- Project list and project details are scoped to the current workspace.

## Role permissions

| Capability | Admin | Manager | Member | Viewer |
| --- | --- | --- | --- | --- |
| View tasks and team | Yes | Yes | Yes | Yes |
| Create tasks | Yes | Yes | Yes | No |
| Edit any task | Yes | Yes | No | No |
| Edit assigned task | Yes | Yes | Yes | No |
| Reassign tasks | Yes | Yes | No | No |
| Add/edit/remove columns | Yes | Yes | No | No |
| Archive and restore | Yes | Yes | No | No |
| Permanent delete | Yes | No | No | No |
| Manage members and roles | Yes | No | No | No |
| Create/edit projects | Yes | Yes | No | No |
| Archive/restore projects | Yes | Yes | No | No |
| Permanently delete empty projects | Yes | No | No | No |

Permission checks run in the UI and again in the task, column, and user APIs.

## Task lifecycle

- Create, edit, complete, archive, restore, and permanently delete tasks.
- Assign one or more owners, project, group, status, priority, due date, tags,
  progress, and description.
- Break a top-level task into subtasks; subtask progress rolls up to the parent.
- Expand and complete subtasks from the grouped list or task details.
- Search by title, project, owner, or tag.
- Filter by status and priority.
- View work as a grouped list, drag-and-drop board, or calendar.
- Archived tasks are hidden from active projects and available in Archive.
- My Work follows the selected current workspace user.
- Every task references a real project and assignee by foreign key.
- Task creator, last updater, assignment actor, archive actor, and timestamps
  are auditable.
- A task cannot be assigned to an inactive or out-of-workspace user.

## Custom columns

- Add, rename, re-type, and remove columns.
- Supported types: text, number, date, status, person, dropdown, checkbox,
  progress, and tags.
- Status and dropdown option lists are configurable.
- Values can be edited inline in the list and in the task details form.
- Column definitions and values persist in Neon; demo mode uses local storage.
- Column definitions are ordered and scoped to a project.

## Data integrity acceptance criteria

- User identity and workspace membership are separate records.
- Workspace roles live on membership, not on the global user record.
- Projects reference a workspace and owner with foreign keys.
- Tasks reference projects and users with foreign keys; names are presentation
  data, not relational keys.
- Project membership uses a join table with a composite unique key.
- Typed custom values use a `(task_id, column_id)` unique key.
- Deletes are restricted when child data exists; lifecycle operations use
  archive fields.
- All mutation APIs validate workspace scope and role on the server.
- Schema migrations are versioned, idempotent, additive, and preserve existing
  prototype data.

## Experience and platform

- Full light and dark themes.
- Persistent database-backed sign-up/sign-in/sign-out with role-aware workspace
  accounts.
- Authentication forms use source-owned shadcn UI components.
- Responsive desktop, tablet, and mobile navigation.
- Optimistic UI updates with local fallback when Neon is unavailable.
- Neon schema setup is idempotent and does not drop existing data.
- API validation returns 401 for missing identity, 403 for disallowed role
  actions, and 400 for invalid input.

The built-in identity switcher exists for role testing. A public production
deployment should replace the demo identity header with Auth.js, Clerk, or an
equivalent verified session while keeping the same server-side permission layer.
