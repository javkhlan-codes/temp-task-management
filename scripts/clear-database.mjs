import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing.");
  process.exit(1);
}
if (!process.argv.includes("--confirm")) {
  console.error("Refusing to clear the database without --confirm.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const before = await sql`
  SELECT
    (SELECT COUNT(*)::int FROM users) AS users,
    (SELECT COUNT(*)::int FROM workspaces) AS workspaces,
    (SELECT COUNT(*)::int FROM projects) AS projects,
    (SELECT COUNT(*)::int FROM tasks) AS tasks
`;

await sql.transaction([
  sql`
    TRUNCATE TABLE
      workspace_users,
      tasks,
      custom_columns,
      workspaces,
      users,
      password_reset_attempts
    RESTART IDENTITY CASCADE
  `,
  sql`
    INSERT INTO workspaces (id, name, slug, plan)
    VALUES ('workspace-acme', 'My Workspace', 'my-workspace', 'free')
  `,
]);

console.log(
  `Database cleared: ${before[0].users} users, ${before[0].workspaces} workspaces, ${before[0].projects} projects, and ${before[0].tasks} tasks removed.`,
);
console.log("An empty bootstrap workspace remains for the first admin signup.");
