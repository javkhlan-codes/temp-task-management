import { neon } from "@neondatabase/serverless";
import { TOTP } from "totp-generator";
import { createHash } from "node:crypto";

const baseUrl = process.argv[2] ?? "http://localhost:8000";
const sql = neon(process.env.DATABASE_URL);
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const email = `totp-check-${suffix}@example.com`;
const originalPassword = "test-password-1";
const resetPassword = "test-password-2";
const workspaceName = `TOTP verification ${suffix}`;
const projectName = `TOTP verification project ${suffix}`;

async function cleanupTestAccounts(targetEmail) {
  await sql`
    DELETE FROM projects
    WHERE name = ${projectName}
      AND NOT EXISTS (SELECT 1 FROM tasks WHERE tasks.project_id = projects.id)
  `;
  await sql`
    DELETE FROM workspaces
    WHERE name = ${workspaceName}
      AND NOT EXISTS (
        SELECT 1 FROM projects WHERE projects.workspace_id = workspaces.id
      )
  `;
  const users = targetEmail
    ? await sql`SELECT id FROM users WHERE LOWER(email) = ${targetEmail}`
    : await sql`SELECT id FROM users WHERE email LIKE 'totp-check-%@example.com'`;
  for (const user of users) {
    const userId = String(user.id);
    await sql`DELETE FROM project_members WHERE user_id = ${userId}`;
    await sql`DELETE FROM workspace_members WHERE user_id = ${userId}`;
    await sql`DELETE FROM users WHERE id = ${userId}`;
  }
  if (targetEmail) {
    const identifierHash = createHash("sha256").update(targetEmail).digest("hex");
    await sql`
      DELETE FROM password_reset_attempts
      WHERE identifier_hash = ${identifierHash}
    `;
  }
}

async function request(path, init = {}, cookie = "") {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...init.headers,
    },
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`${init.method ?? "GET"} ${path} returned ${response.status}: ${payload.error ?? "Unknown error"}`);
  }
  return { response, payload };
}

await cleanupTestAccounts();
const existingMemberships = await sql`
  SELECT COUNT(*)::int AS count
  FROM workspace_members
  WHERE workspace_id = 'workspace-acme' AND active = TRUE
`;
const expectedRole = Number(existingMemberships[0]?.count ?? 0) === 0
  ? "admin"
  : "member";

try {
  const signup = await request("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      name: "TOTP Flow Check",
      email,
      password: originalPassword,
    }),
  });
  if (!signup.payload.requiresTotpSetup) {
    throw new Error("New account did not require TOTP setup");
  }
  if (signup.payload.user?.role !== expectedRole) {
    throw new Error(
      `New account received ${signup.payload.user?.role ?? "no role"}; expected ${expectedRole}`,
    );
  }
  const cookie = signup.response.headers.get("set-cookie")?.split(";")[0] ?? "";
  if (!cookie) throw new Error("Signup did not set a session cookie");

  const blockedWorkspaceRequest = await fetch(`${baseUrl}/api/workspaces`, {
    headers: { Cookie: cookie },
  });
  if (blockedWorkspaceRequest.status !== 401) {
    throw new Error(
      `Unconfirmed TOTP account accessed workspaces with status ${blockedWorkspaceRequest.status}`,
    );
  }

  const setup = await request("/api/auth/totp/setup", { method: "POST" }, cookie);
  const { otp } = await TOTP.generate(setup.payload.secret, {
    explicitZeroPad: true,
  });
  const confirmation = await request(
    "/api/auth/totp/confirm",
    { method: "POST", body: JSON.stringify({ code: otp }) },
    cookie,
  );
  if (confirmation.payload.recoveryCodes?.length !== 8) {
    throw new Error("TOTP setup did not return 8 recovery codes");
  }
  await request("/api/workspaces", {}, cookie);
  const createdWorkspace = await request(
    "/api/workspaces",
    { method: "POST", body: JSON.stringify({ name: workspaceName }) },
    cookie,
  );
  if (createdWorkspace.payload.workspace?.role !== "admin") {
    throw new Error("New workspace did not grant its creator the admin role");
  }
  const testWorkspaceId = createdWorkspace.payload.workspace.id;
  const now = new Date().toISOString();
  const project = {
    id: `project-totp-${suffix}`,
    workspaceId: testWorkspaceId,
    name: projectName,
    color: "#7c5cff",
    description: "Temporary project lifecycle verification",
    ownerId: signup.payload.user.id,
    memberIds: [signup.payload.user.id],
    archived: false,
    archivedAt: null,
    taskCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  await request(
    "/api/projects",
    {
      method: "POST",
      headers: { "x-workspace-id": testWorkspaceId },
      body: JSON.stringify(project),
    },
    cookie,
  );
  await request(
    `/api/projects/${project.id}`,
    {
      method: "PATCH",
      headers: { "x-workspace-id": testWorkspaceId },
      body: JSON.stringify({ ...project, archived: true, archivedAt: now }),
    },
    cookie,
  );
  await request(
    `/api/projects/${project.id}`,
    {
      method: "DELETE",
      headers: { "x-workspace-id": testWorkspaceId },
    },
    cookie,
  );
  await request(
    `/api/workspaces/${testWorkspaceId}`,
    {
      method: "DELETE",
      headers: { "x-workspace-id": testWorkspaceId },
    },
    cookie,
  );

  const currentCode = await TOTP.generate(setup.payload.secret, {
    explicitZeroPad: true,
  });
  const recovery = await request("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email, proof: currentCode.otp }),
  });
  await request("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({
      token: recovery.payload.resetToken,
      password: resetPassword,
    }),
  });

  const login = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password: resetPassword, remember: false }),
  });
  if (login.payload.requiresTotpSetup) {
    throw new Error("Confirmed TOTP account unexpectedly required setup again");
  }

  console.log(
    "TOTP auth plus workspace and project create/delete flows passed.",
  );
} finally {
  await cleanupTestAccounts(email);
}
