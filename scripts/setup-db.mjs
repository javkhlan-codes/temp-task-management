import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Copy .env.example to .env.local and add your Neon URL.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS workspace_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    initials TEXT NOT NULL,
    tone TEXT NOT NULL DEFAULT 'slate',
    role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'member', 'viewer')),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

const defaultUsers = [
  {
    id: "user-ariuna",
    name: "Ariuna B.",
    email: "ariuna@acme.mn",
    initials: "AB",
    tone: "violet",
    role: "admin",
    active: true,
  },
  {
    id: "user-temuulen",
    name: "Temuulen E.",
    email: "temuulen@acme.mn",
    initials: "TE",
    tone: "cyan",
    role: "manager",
    active: true,
  },
  {
    id: "user-nomin",
    name: "Nomin S.",
    email: "nomin@acme.mn",
    initials: "NS",
    tone: "amber",
    role: "member",
    active: true,
  },
  {
    id: "user-bilguun",
    name: "Bilguun G.",
    email: "bilguun@acme.mn",
    initials: "BG",
    tone: "rose",
    role: "viewer",
    active: true,
  },
];

for (const user of defaultUsers) {
  await sql`
    INSERT INTO workspace_users (
      id, name, email, initials, tone, role, active
    )
    VALUES (
      ${user.id}, ${user.name}, ${user.email}, ${user.initials},
      ${user.tone}, ${user.role}, ${user.active}
    )
    ON CONFLICT (id) DO NOTHING
  `;
}

await sql`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    project TEXT NOT NULL,
    group_name TEXT NOT NULL DEFAULT 'This week',
    status TEXT NOT NULL CHECK (
      status IN ('Not started', 'Working on it', 'In review', 'Done')
    ),
    priority TEXT NOT NULL CHECK (
      priority IN ('Low', 'Medium', 'High', 'Critical')
    ),
    assignee JSONB NOT NULL,
    due_date DATE NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    description TEXT NOT NULL DEFAULT '',
    custom_fields JSONB NOT NULL DEFAULT '{}',
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

await sql`
  ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'
`;
await sql`
  ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE
`;
await sql`
  ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ
`;

for (const user of defaultUsers) {
  await sql`
    UPDATE tasks
    SET assignee = ${JSON.stringify(user)}::jsonb
    WHERE assignee ->> 'name' = ${user.name}
      AND COALESCE(assignee ->> 'id', '') = ''
  `;
}

await sql`
  CREATE TABLE IF NOT EXISTS custom_columns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (
      type IN (
        'text', 'number', 'date', 'status', 'person',
        'dropdown', 'checkbox', 'progress', 'tags'
      )
    ),
    options JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

await sql`CREATE INDEX IF NOT EXISTS tasks_project_idx ON tasks (project)`;
await sql`CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks (status)`;
await sql`CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON tasks (due_date)`;
await sql`CREATE INDEX IF NOT EXISTS tasks_archived_idx ON tasks (archived)`;

const defaultColumns = [
  {
    id: "column-estimate",
    name: "Estimate",
    type: "number",
    options: [],
    createdAt: "2026-07-10T00:00:00.000Z",
  },
  {
    id: "column-sprint",
    name: "Sprint",
    type: "dropdown",
    options: ["Sprint 12", "Sprint 13", "Backlog"],
    createdAt: "2026-07-10T00:01:00.000Z",
  },
  {
    id: "column-approved",
    name: "Approved",
    type: "checkbox",
    options: [],
    createdAt: "2026-07-10T00:02:00.000Z",
  },
];

for (const column of defaultColumns) {
  await sql`
    INSERT INTO custom_columns (id, name, type, options, created_at)
    VALUES (
      ${column.id}, ${column.name}, ${column.type},
      ${JSON.stringify(column.options)}::jsonb, ${column.createdAt}::timestamptz
    )
    ON CONFLICT (id) DO NOTHING
  `;
}

const rows = await sql`SELECT COUNT(*)::int AS count FROM tasks`;
if (rows[0].count === 0) {
  const seeds = [
    {
      id: "task-001",
      title: "Research customer onboarding flow",
      project: "Product launch",
      group: "This week",
      status: "Working on it",
      priority: "High",
      assignee: defaultUsers[0],
      dueDate: "2026-07-23",
      tags: ["Research", "UX"],
      progress: 62,
      description: "Interview five active customers and map the main friction points.",
      createdAt: "2026-07-16T02:00:00.000Z",
    },
    {
      id: "task-002",
      title: "Finalize visual design system",
      project: "Product launch",
      group: "This week",
      status: "In review",
      priority: "Critical",
      assignee: defaultUsers[2],
      dueDate: "2026-07-25",
      tags: ["Design"],
      progress: 88,
      description: "Complete tokens, interaction states, and the component handoff.",
      createdAt: "2026-07-14T05:20:00.000Z",
    },
    {
      id: "task-003",
      title: "Build dashboard analytics cards",
      project: "Product launch",
      group: "This week",
      status: "Working on it",
      priority: "Medium",
      assignee: defaultUsers[1],
      dueDate: "2026-07-28",
      tags: ["Frontend"],
      progress: 43,
      description: "Implement responsive cards and wire them to the metrics endpoint.",
      createdAt: "2026-07-18T07:45:00.000Z",
    },
    {
      id: "task-004",
      title: "Set up product event tracking",
      project: "Product launch",
      group: "This week",
      status: "Not started",
      priority: "High",
      assignee: defaultUsers[3],
      dueDate: "2026-07-30",
      tags: ["Analytics"],
      progress: 0,
      description: "Define the event taxonomy and add key funnel events.",
      createdAt: "2026-07-20T09:15:00.000Z",
    },
    {
      id: "task-005",
      title: "Approve campaign landing page",
      project: "Product launch",
      group: "Upcoming",
      status: "In review",
      priority: "Medium",
      assignee: defaultUsers[0],
      dueDate: "2026-08-02",
      tags: ["Marketing", "Web"],
      progress: 92,
      description: "Review final messaging and responsive layouts before publishing.",
      createdAt: "2026-07-17T01:30:00.000Z",
    },
    {
      id: "task-006",
      title: "Create product announcement video",
      project: "Product launch",
      group: "Upcoming",
      status: "Not started",
      priority: "Medium",
      assignee: defaultUsers[2],
      dueDate: "2026-08-05",
      tags: ["Content"],
      progress: 12,
      description: "Produce a 45-second product overview for launch channels.",
      createdAt: "2026-07-19T11:00:00.000Z",
    },
  ];

  for (const task of seeds) {
    await sql`
      INSERT INTO tasks (
        id, title, project, group_name, status, priority, assignee,
        due_date, tags, progress, description, created_at
      )
      VALUES (
        ${task.id}, ${task.title}, ${task.project}, ${task.group},
        ${task.status}, ${task.priority}, ${JSON.stringify(task.assignee)}::jsonb,
        ${task.dueDate}::date, ${task.tags}, ${task.progress},
        ${task.description}, ${task.createdAt}::timestamptz
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }
  console.log(
    `Database ready. Seeded ${seeds.length} tasks, ${defaultUsers.length} users, and ${defaultColumns.length} custom columns.`,
  );
} else {
  console.log(
    `Database ready. Found ${rows[0].count} existing tasks; ensured ${defaultUsers.length} users and ${defaultColumns.length} custom columns.`,
  );
}

const normalizedMigration = readFileSync(
  new URL("../db/migrations/002_normalized_workspace.sql", import.meta.url),
  "utf8",
);

function splitSqlStatements(source) {
  const statements = [];
  let current = "";
  let singleQuoted = false;
  let doubleQuoted = false;
  let lineComment = false;
  let blockComment = false;
  let dollarTag = null;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (lineComment) {
      current += char;
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      current += char;
      if (char === "*" && next === "/") {
        current += next;
        index += 1;
        blockComment = false;
      }
      continue;
    }
    if (dollarTag) {
      if (source.startsWith(dollarTag, index)) {
        current += dollarTag;
        index += dollarTag.length - 1;
        dollarTag = null;
      } else {
        current += char;
      }
      continue;
    }
    if (!singleQuoted && !doubleQuoted && char === "-" && next === "-") {
      current += `${char}${next}`;
      index += 1;
      lineComment = true;
      continue;
    }
    if (!singleQuoted && !doubleQuoted && char === "/" && next === "*") {
      current += `${char}${next}`;
      index += 1;
      blockComment = true;
      continue;
    }
    if (!singleQuoted && !doubleQuoted && char === "$") {
      const match = source.slice(index).match(/^\$[A-Za-z0-9_]*\$/);
      if (match) {
        dollarTag = match[0];
        current += dollarTag;
        index += dollarTag.length - 1;
        continue;
      }
    }
    if (!doubleQuoted && char === "'" && source[index - 1] !== "\\") {
      singleQuoted = !singleQuoted;
      current += char;
      continue;
    }
    if (!singleQuoted && char === '"' && source[index - 1] !== "\\") {
      doubleQuoted = !doubleQuoted;
      current += char;
      continue;
    }
    if (!singleQuoted && !doubleQuoted && char === ";") {
      if (current.trim()) statements.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  if (current.trim()) statements.push(current.trim());
  return statements;
}

for (const statement of splitSqlStatements(normalizedMigration)) {
  await sql(statement);
}
console.log("Normalized workspace/project migration is applied.");
