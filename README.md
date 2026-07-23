# Nimbus Task Management

A polished Monday-style task management workspace built with Next.js. It includes
light and dark themes, list/kanban/calendar views, filters, task editing,
drag-and-drop status updates, responsive navigation, typed custom columns, inline
cell editing, and optional Neon persistence.

Custom columns support text, number, date, status, person, dropdown, checkbox,
progress, and tags. Column names, types, and dropdown options can be edited at any
time; columns can also be removed.

Workspace access includes Admin, Manager, Member, and Viewer roles. Tasks can be
assigned to active members, filtered through My Work, archived/restored by
authorized roles, and permanently deleted by admins. The profile menu can switch
demo identities so every permission level is easy to test.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Without a database the app
runs in demo mode and saves changes to browser local storage.

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
Neon. The identity switcher is intentionally a demo surface; replace it with an
authenticated session provider before public production use.
