export const runtime = "nodejs";

import { getSessionFromCookies } from "@/lib/auth";
import { deleteMealRecord } from "@/lib/db";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromCookies();

  if (!session) {
    return Response.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await context.params;
  const deleted = deleteMealRecord(session.userId, id);

  if (!deleted) {
    return Response.json({ error: "记录不存在" }, { status: 404 });
  }

  return Response.json({ ok: true });
}
