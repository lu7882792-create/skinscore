export type ImpactDirection = "positive" | "negative" | "neutral";

export type PortionLabel =
  | "tiny"
  | "small"
  | "medium"
  | "large"
  | "very_large";

export type FactorKey =
  | "glycemic_load_refined_carbs"
  | "added_sugar"
  | "dairy_whey"
  | "fiber_low_gl_whole_food"
  | "omega3";

export type Confidence = "high" | "medium" | "low";

export type FoodFactor = {
  factor_key: FactorKey;
  factor_name: string;
  direction: ImpactDirection;
  factor_score: number;
  explanation: string;
};

export type EstimatedPortion = {
  label: PortionLabel;
  multiplier: number;
  explanation: string;
};

export type FoodResult = {
  food_name: string;
  estimated_amount: string;
  estimated_portion: EstimatedPortion;
  base_acne_score: number;
  acne_score: number;
  impact: ImpactDirection;
  factors: FoodFactor[];
  reason: string;
};

export type AnalyzeResult = {
  meal_score: number;
  acne_impact: ImpactDirection;
  confidence: Confidence;
  summary: string;
  foods: FoodResult[];
  suggestion: string;
};

export type MealRecord = {
  id: string;
  created_at: string;
  input_text: string;
  image_preview_url: string | null;
  result: AnalyzeResult;
};

export const STORAGE_KEY = "skinscore_meal_records_v3";

export const FACTOR_META: Record<
  FactorKey,
  { factor_name: string; min: number; max: number }
> = {
  glycemic_load_refined_carbs: {
    factor_name: "高升糖负荷 / 精制碳水",
    min: -4,
    max: 0,
  },
  added_sugar: {
    factor_name: "添加糖暴露",
    min: -3,
    max: 0,
  },
  dairy_whey: {
    factor_name: "乳制品 / 乳清暴露",
    min: -3,
    max: 0,
  },
  fiber_low_gl_whole_food: {
    factor_name: "膳食纤维 / 低升糖完整食物",
    min: 0,
    max: 3,
  },
  omega3: {
    factor_name: "Omega-3 保护信号",
    min: 0,
    max: 2,
  },
};

const PORTION_LABELS: Record<PortionLabel, string> = {
  tiny: "极少量",
  small: "少量",
  medium: "中等份量",
  large: "较大份量",
  very_large: "大量",
};

export function isToday(isoString: string): boolean {
  const date = new Date(isoString);
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function formatScore(score: number): string {
  return score > 0 ? `+${score}` : `${score}`;
}

export function getImpactLabel(impact: ImpactDirection): string {
  if (impact === "positive") return "正向";
  if (impact === "negative") return "负向";
  return "中性";
}

export function getPortionLabel(label: PortionLabel): string {
  return PORTION_LABELS[label] || "中等份量";
}

export function getScoreColor(score: number): string {
  if (score > 0) return "text-emerald-600";
  if (score < 0) return "text-rose-500";
  return "text-slate-500";
}

export function getImpactColor(impact: ImpactDirection): string {
  if (impact === "positive") return "text-emerald-700 bg-emerald-50";
  if (impact === "negative") return "text-rose-700 bg-rose-50";
  return "text-slate-600 bg-slate-100";
}

export function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
