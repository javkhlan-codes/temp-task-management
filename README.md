# Nimbus Task Management

A polished Monday-style task management workspace built with Next.js. It includes
light and dark themes, list/kanban/calendar views, filters, task editing,
drag-and-drop status updates, responsive navigation, typed custom columns, inline
cell editing, nested subtasks, multi-person assignment, and optional Neon
persistence.

Custom columns support text, number, date, status, person, dropdown, checkbox,
progress, and tags. Column names, types, and dropdown options can be edited at any
time; columns can also be removed.

Workspace access includes database-backed sign-up, login, logout, HttpOnly
sessions, plus Admin, Manager, Member, and Viewer roles. Tasks can be assigned to multiple active members,
filtered through My Work, broken into nested subtasks, archived/restored by
authorized roles, and permanently deleted by admins. The account menu can switch
demo identities so every permission level is easy to test.

Projects are database-backed workspace entities with owners, members, colors,
descriptions, task counts, archive/restore, and guarded deletion. Tasks and
assignees use normalized foreign keys; project-specific custom columns no longer
leak between projects. See [requirements](docs/REQUIREMENTS.md),
[architecture](docs/ARCHITECTURE.md), and the [ERD](docs/ERD.md).

## Run locally

```bash
npm install

npm run dev
```

Open [http://localhost:8000](http://localhost:8000). Authentication and shared
workspace persistence require the configured Neon database.

## Connect Neon

1. Copy `.env.example` to `.env.local` (an existing `.env` also works).
2. Add the pooled Neon Postgres connection string as `DATABASE_URL`.
3. Initialize the schema and demo rows:

```bash
npm run db:setup
npm run dev
```

The UI displays `Neon connected` when the database API is available.

## Access model

- Admin: full task, archive, column, role, member, and permanent-delete access.
- Manager: manages tasks, assignments, custom columns, and archives.
- Member: creates tasks and edits only tasks assigned to them.
- Viewer: read-only workspace access.

Mutation routes validate the current workspace user against the role stored in
Neon. Passwords are scrypt-hashed, session tokens are stored as hashes, and
browsers receive opaque HttpOnly cookies. The four seeded demo accounts use the
password `nimbus`; newly registered accounts join as Members.
