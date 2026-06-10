import { supabase } from "@/lib/supabase";

export type RemoteMealRecordInput = {
  inputText?: string;
  imagePreviewUrl?: string;
  result: any;
  mealScore?: number | null;
  acneImpact?: string | null;
};

export type RemoteMealRecord = {
  id: string;
  user_id: string;
  created_at: string;
  input_text: string | null;
  image_preview_url: string | null;
  result: any;
  meal_score: number | null;
  acne_impact: string | null;
};

export async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return data.user?.id ?? null;
}

export async function isUserLoggedIn() {
  const userId = await getCurrentUserId();
  return Boolean(userId);
}

export async function saveRemoteMealRecord(record: RemoteMealRecordInput) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return {
      success: false,
      error: "用户未登录，无法保存到云端。",
    };
  }

  const mealScore =
    record.mealScore ??
    record.result?.meal_score ??
    record.result?.skin_score ??
    record.result?.score ??
    null;

  const acneImpact =
    record.acneImpact ??
    record.result?.acne_impact ??
    record.result?.impact ??
    null;

  const { data, error } = await supabase
    .from("meal_records")
    .insert({
      user_id: userId,
      input_text: record.inputText ?? null,
      image_preview_url: record.imagePreviewUrl ?? null,
      result: record.result,
      meal_score: mealScore,
      acne_impact: acneImpact,
    })
    .select()
    .single();

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
    data,
  };
}

export async function getRemoteMealRecords() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return {
      success: false,
      data: [] as RemoteMealRecord[],
      error: "用户未登录。",
    };
  }

  const { data, error } = await supabase
    .from("meal_records")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      success: false,
      data: [] as RemoteMealRecord[],
      error: error.message,
    };
  }

  return {
    success: true,
    data: (data ?? []) as RemoteMealRecord[],
  };
}

export async function deleteRemoteMealRecord(id: string) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return {
      success: false,
      error: "用户未登录。",
    };
  }

  const { error } = await supabase
    .from("meal_records")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
  };
}