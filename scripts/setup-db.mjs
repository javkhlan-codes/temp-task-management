import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Copy .env.example to .env.local and add your Neon URL.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

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

async function runSqlFile(relativePath) {
  const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
  for (const statement of splitSqlStatements(source)) {
    await sql(statement);
  }
}

await runSqlFile("../db/schema.sql");
await sql`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

const migrations = [
  ["001_legacy_baseline", "../db/migrations/001_legacy_baseline.sql"],
  ["002_normalized_workspace", "../db/migrations/002_normalized_workspace.sql"],
  ["003_task_collaboration", "../db/migrations/003_task_collaboration.sql"],
  ["004_authentication", "../db/migrations/004_authentication.sql"],
  ["005_urs_collaboration", "../db/migrations/005_urs_collaboration.sql"],
  ["006_task_planning", "../db/migrations/006_task_planning.sql"],
  ["008_totp_recovery", "../db/migrations/008_totp_recovery.sql"],
];

for (const [version, relativePath] of migrations) {
  const applied = await sql`
    SELECT 1 FROM schema_migrations WHERE version = ${version} LIMIT 1
  `;
  if (!applied.length) await runSqlFile(relativePath);
}

await sql`DELETE FROM auth_sessions WHERE expires_at <= NOW()`;
await sql`DELETE FROM password_reset_tokens WHERE expires_at <= NOW()`;
await sql`
  DELETE FROM password_reset_attempts
  WHERE attempted_at < NOW() - INTERVAL '1 day'
`;

const counts = await sql`
  SELECT
    (SELECT COUNT(*)::int FROM users) AS users,
    (SELECT COUNT(*)::int FROM projects) AS projects,
    (SELECT COUNT(*)::int FROM tasks) AS tasks
`;
console.log(
  `Database ready. ${counts[0].users} users, ${counts[0].projects} projects, and ${counts[0].tasks} tasks. No demo data was seeded.`,
);
