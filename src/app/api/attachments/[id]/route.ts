import { NextResponse } from "next/server";
import { getActor, getWorkspaceId } from "@/lib/api-auth";
import { getDatabase } from "@/lib/db";
import { getTaskAccessContext } from "@/lib/task-access";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const sql = getDatabase();
  if (!sql) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 },
    );
  }

  try {
    const actor = await getActor(request, sql);
    if (!actor) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const { id } = await context.params;
    const workspaceId = getWorkspaceId(request);
    const rows = await sql`
      SELECT
        task_attachments.task_id,
        task_attachments.file_name,
        task_attachments.mime_type,
        ENCODE(task_attachments.content, 'base64') AS data
      FROM task_attachments
      JOIN tasks ON tasks.id = task_attachments.task_id
      JOIN projects ON projects.id = tasks.project_id
      WHERE task_attachments.id = ${id}
        AND projects.workspace_id = ${workspaceId}
      LIMIT 1
    `;
    if (!rows.length) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }
    const task = await getTaskAccessContext(
      sql,
      String(rows[0].task_id),
      workspaceId,
      actor,
    );
    if (!task) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }
    const bytes = new Uint8Array(
      Buffer.from(String(rows[0].data), "base64"),
    );
    const fileName = String(rows[0].file_name).replace(/[\r\n"]/g, "_");
    return new Response(bytes, {
      headers: {
        "Content-Type": String(rows[0].mime_type),
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Unable to download attachment", error);
    return NextResponse.json(
      { error: "Unable to download attachment" },
      { status: 500 },
    );
  }
}
