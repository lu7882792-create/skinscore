import type { MealRecord } from "@/lib/mealRecords";
import { STORAGE_KEY } from "@/lib/mealRecords";
import { supabase } from "@/lib/supabase";
import {
  deleteRemoteMealRecord,
  getRemoteMealRecords,
  saveRemoteMealRecord,
  type RemoteMealRecord,
} from "@/lib/remoteMealRecords";

export const RECORDS_UPDATED_EVENT = "skinscore-records-updated";
export const AUTH_UPDATED_EVENT = "skinscore-auth-updated";

export type AuthUser = {
  id: string;
  email: string;
  masked_email: string;

  // 兼容旧页面里可能还在用的字段，后面可以慢慢删
  phone: string;
  masked_phone: string;
};

function notifyRecordsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(RECORDS_UPDATED_EVENT));
  }
}

export function notifyAuthUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_UPDATED_EVENT));
  }
}

function getLocalRecords(): MealRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MealRecord[]) : [];
  } catch {
    return [];
  }
}

function setLocalRecords(records: MealRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function clearLocalRecords() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

function maskEmail(email: string) {
  const [name, domain] = email.split("@");

  if (!name || !domain) {
    return email || "已登录用户";
  }

  if (name.length <= 2) {
    return `${name.slice(0, 1)}***@${domain}`;
  }

  return `${name.slice(0, 2)}***@${domain}`;
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  const email = data.user.email ?? "";
  const maskedEmail = maskEmail(email);

  return {
    id: data.user.id,
    email,
    masked_email: maskedEmail,

    // 兼容旧字段
    phone: email,
    masked_phone: maskedEmail,
  };
}

function mapRemoteRecordToMealRecord(row: RemoteMealRecord): MealRecord {
  const originalRecord = (row.result ?? {}) as MealRecord;
  const originalAny = originalRecord as any;

  return {
    ...originalRecord,
    id: row.id,
    created_at: originalAny.created_at ?? row.created_at,
    createdAt: originalAny.createdAt ?? row.created_at,
  } as MealRecord;
}

export async function fetchAllRecords(): Promise<MealRecord[]> {
  const user = await fetchCurrentUser();

  if (!user) {
    return getLocalRecords();
  }

  const response = await getRemoteMealRecords();

  if (!response.success) {
    return [];
  }

  return response.data.map(mapRemoteRecordToMealRecord);
}

function getMealScoreFromRecord(record: MealRecord) {
  const anyRecord = record as any;

  return (
    anyRecord.meal_score ??
    anyRecord.mealScore ??
    anyRecord.skin_score ??
    anyRecord.skinScore ??
    anyRecord.score ??
    anyRecord.result?.meal_score ??
    anyRecord.result?.skin_score ??
    null
  );
}

function getAcneImpactFromRecord(record: MealRecord) {
  const anyRecord = record as any;

  return (
    anyRecord.acne_impact ??
    anyRecord.acneImpact ??
    anyRecord.impact ??
    anyRecord.result?.acne_impact ??
    anyRecord.result?.impact ??
    null
  );
}

function getInputTextFromRecord(record: MealRecord) {
  const anyRecord = record as any;

  return (
    anyRecord.input_text ??
    anyRecord.inputText ??
    anyRecord.user_input ??
    anyRecord.userInput ??
    anyRecord.query ??
    anyRecord.food_text ??
    anyRecord.foodText ??
    null
  );
}

function getImagePreviewUrlFromRecord(record: MealRecord) {
  const anyRecord = record as any;

  return (
    anyRecord.image_preview_url ??
    anyRecord.imagePreviewUrl ??
    anyRecord.image_url ??
    anyRecord.imageUrl ??
    null
  );
}

export async function saveMealRecord(record: MealRecord) {
  const user = await fetchCurrentUser();

  if (user) {
    const response = await saveRemoteMealRecord({
      inputText: getInputTextFromRecord(record),
      imagePreviewUrl: getImagePreviewUrlFromRecord(record),
      result: record,
      mealScore: getMealScoreFromRecord(record),
      acneImpact: getAcneImpactFromRecord(record),
    });

    if (!response.success) {
      throw new Error(response.error || "保存到云端失败");
    }
  } else {
    const previous = getLocalRecords();
    setLocalRecords([record, ...previous].slice(0, 200));
  }

  notifyRecordsUpdated();
}

export async function deleteMealRecord(recordId: string) {
  const user = await fetchCurrentUser();

  if (user) {
    const response = await deleteRemoteMealRecord(recordId);

    if (!response.success) {
      throw new Error(response.error || "删除云端记录失败");
    }
  } else {
    const next = getLocalRecords().filter((record) => record.id !== recordId);
    setLocalRecords(next);
  }

  notifyRecordsUpdated();
}

export async function logoutUser() {
  await supabase.auth.signOut();

  notifyAuthUpdated();
  notifyRecordsUpdated();
}