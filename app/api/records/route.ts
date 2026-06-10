export const runtime = "nodejs";

import { getSessionFromCookies } from "@/lib/auth";
import {
  createMealRecord,
  getMealRecordsByUserId,
} from "@/lib/db";
import type { MealRecord } from "@/lib/mealRecords";

export async function GET() {
  const session = await getSessionFromCookies();

  if (!session) {
    return Response.json({ error: "请先登录" }, { status: 401 });
  }

  const records = getMealRecordsByUserId(session.userId);

  return Response.json({ records });
}

export async function POST(request: Request) {
  const session = await getSessionFromCookies();

  if (!session) {
    return Response.json({ error: "请先登录后再保存记录" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const record = body.record as MealRecord | undefined;

    if (!record?.id || !record.created_at || !record.result) {
      return Response.json({ error: "无效的记录数据" }, { status: 400 });
    }

    const saved = createMealRecord(session.userId, record);

    return Response.json({ record: saved });
  } catch (error) {
    console.error("create record error:", error);
    return Response.json({ error: "保存记录失败" }, { status: 500 });
  }
}
