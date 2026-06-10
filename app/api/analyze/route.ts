export const runtime = "nodejs";

import {
  FACTOR_META,
  type AnalyzeResult,
  type Confidence,
  type FactorKey,
  type FoodFactor,
  type FoodResult,
  type ImpactDirection,
  type PortionLabel,
} from "@/lib/mealRecords";

const FACTOR_KEYS: FactorKey[] = [
  "glycemic_load_refined_carbs",
  "added_sugar",
  "dairy_whey",
  "fiber_low_gl_whole_food",
  "omega3",
];

const PORTION_MULTIPLIERS: Record<PortionLabel, number> = {
  tiny: 0.25,
  small: 0.5,
  medium: 1,
  large: 1.5,
  very_large: 2,
};

function extractJson(text: string) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error("No JSON object found in AI response");
  }

  const cleaned = jsonMatch[0]
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .replace(/:\s*\+(\d+)/g, ": $1")
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]")
    .trim();

  return JSON.parse(cleaned);
}

function clampNumber(value: unknown, min: number, max: number, fallback = 0) {
  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, numberValue));
}

function clampFoodScore(value: number) {
  return Math.round(Math.max(-10, Math.min(10, value)));
}

function getImpactByScore(score: number): ImpactDirection {
  if (score >= 2) return "positive";
  if (score <= -2) return "negative";
  return "neutral";
}

function getDirectionByScore(score: number): ImpactDirection {
  if (score > 0) return "positive";
  if (score < 0) return "negative";
  return "neutral";
}

function normalizePortion(raw: unknown): FoodResult["estimated_portion"] {
  const portion = raw as Record<string, unknown>;
  const label = String(portion?.label || "medium") as PortionLabel;
  const allowedLabels = Object.keys(PORTION_MULTIPLIERS) as PortionLabel[];
  const safeLabel = allowedLabels.includes(label) ? label : "medium";

  const rawMultiplier = Number(portion?.multiplier);
  const multiplier = Number.isNaN(rawMultiplier)
    ? PORTION_MULTIPLIERS[safeLabel]
    : clampNumber(rawMultiplier, 0.25, 2, PORTION_MULTIPLIERS[safeLabel]);

  return {
    label: safeLabel,
    multiplier,
    explanation:
      String(portion?.explanation || "") ||
      "根据图片或文字描述进行的粗略份量估计。",
  };
}

function normalizeFactor(rawFactor: unknown, key: FactorKey): FoodFactor {
  const factor = rawFactor as Record<string, unknown>;
  const meta = FACTOR_META[key];
  const factorScore = Math.round(
    clampNumber(factor?.factor_score, meta.min, meta.max, 0)
  );

  return {
    factor_key: key,
    factor_name: String(factor?.factor_name || meta.factor_name),
    direction: getDirectionByScore(factorScore),
    factor_score: factorScore,
    explanation: String(factor?.explanation || "未检测到明显相关信号。"),
  };
}

function normalizeFactors(rawFactors: unknown): FoodFactor[] {
  const factorMap = new Map<FactorKey, FoodFactor>();

  if (Array.isArray(rawFactors)) {
    for (const rawFactor of rawFactors) {
      const factor = rawFactor as Record<string, unknown>;
      const key = String(factor?.factor_key || "") as FactorKey;

      if (FACTOR_KEYS.includes(key)) {
        factorMap.set(key, normalizeFactor(rawFactor, key));
      }
    }
  }

  return FACTOR_KEYS.map((key) => {
    if (factorMap.has(key)) {
      return factorMap.get(key)!;
    }

    return {
      factor_key: key,
      factor_name: FACTOR_META[key].factor_name,
      direction: "neutral" as ImpactDirection,
      factor_score: 0,
      explanation: "未检测到明显相关信号。",
    };
  });
}

function sumFactorScores(factors: FoodFactor[]) {
  return factors.reduce((total, factor) => total + factor.factor_score, 0);
}

function recalculateFoodScore(food: FoodResult) {
  food.base_acne_score = sumFactorScores(food.factors);
  food.acne_score = clampFoodScore(
    food.base_acne_score * food.estimated_portion.multiplier
  );
  food.impact = getImpactByScore(food.acne_score);
}

function applyHardRules(food: FoodResult) {
  const name = food.food_name.toLowerCase();
  const combined = `${name} ${food.estimated_amount}`.toLowerCase();

  function setFactor(
    key: FactorKey,
    score: number,
    explanation: string
  ) {
    const meta = FACTOR_META[key];
    const clamped = Math.round(clampNumber(score, meta.min, meta.max, 0));
    const index = food.factors.findIndex((f) => f.factor_key === key);

    food.factors[index] = {
      factor_key: key,
      factor_name: meta.factor_name,
      direction: getDirectionByScore(clamped),
      factor_score: clamped,
      explanation,
    };
  }

  if (
    combined.includes("ketchup") ||
    combined.includes("tomato sauce") ||
    combined.includes("番茄酱") ||
    combined.includes("甜酱")
  ) {
    setFactor(
      "added_sugar",
      -2,
      "番茄酱的问题通常不在番茄本身，而是添加糖与含糖调味品暴露。"
    );
    food.reason =
      "番茄酱通常属于含糖调味酱，对长痘人群可能偏负向；若只是少量蘸酱，份量系数会降低整体影响。";
  }

  if (
    (combined.includes("fried") && combined.includes("chicken")) ||
    combined.includes("炸鸡")
  ) {
    setFactor(
      "glycemic_load_refined_carbs",
      -2,
      "炸鸡外层裹粉属于精制碳水来源，可能提高整餐升糖负荷。"
    );
    setFactor(
      "added_sugar",
      Math.min(
        food.factors.find((f) => f.factor_key === "added_sugar")?.factor_score ??
          0,
        0
      ),
      food.factors.find((f) => f.factor_key === "added_sugar")?.explanation ||
        "若搭配甜酱，添加糖暴露会进一步上升。"
    );
    food.reason =
      "炸鸡对长痘人群通常偏负向，主要与精制碳水裹粉、油脂密度和快餐饮食模式相关，而非简单等同于“吃油一定长痘”。";
  }

  if (
    combined.includes("fries") ||
    combined.includes("french fries") ||
    combined.includes("薯条")
  ) {
    setFactor(
      "glycemic_load_refined_carbs",
      -3,
      "薯条属于土豆制品，油炸后更容易形成高升糖负荷食物。"
    );
    food.reason = "薯条通常同时涉及精制碳水与高升糖负荷，对长痘人群可能不太友好。";
  }

  if (
    combined.includes("milk tea") ||
    combined.includes("bubble tea") ||
    combined.includes("奶茶") ||
    combined.includes("甜饮")
  ) {
    setFactor(
      "added_sugar",
      -3,
      "高糖饮品可能提高血糖波动和整体升糖负荷。"
    );
    setFactor(
      "dairy_whey",
      -2,
      "奶茶中的乳制品暴露对部分长痘人群可能不太友好，但个体差异较大。"
    );
    food.reason = "奶茶通常同时涉及添加糖与乳制品暴露，是长痘人群需要重点控制的饮品。";
  }

  if (
    combined.includes("cake") ||
    combined.includes("dessert") ||
    combined.includes("cookie") ||
    combined.includes("ice cream") ||
    combined.includes("蛋糕") ||
    combined.includes("甜点") ||
    combined.includes("饼干") ||
    combined.includes("冰淇淋")
  ) {
    setFactor(
      "added_sugar",
      -3,
      "高糖甜点可能增加整餐升糖负荷。"
    );
    setFactor(
      "glycemic_load_refined_carbs",
      -2,
      "甜点通常含有精制面粉或高糖配料，容易造成更高的升糖负荷。"
    );
    food.reason = "甜点通常同时带来添加糖与精制碳水暴露，对长痘人群可能偏负向。";
  }

  if (
    combined.includes("salmon") ||
    combined.includes("sardine") ||
    combined.includes("mackerel") ||
    combined.includes("三文鱼") ||
    combined.includes("沙丁鱼") ||
    combined.includes("鲭鱼")
  ) {
    setFactor(
      "omega3",
      2,
      "富含 Omega-3 的鱼类可能与炎症调节相关，通常被视为更友好的信号。"
    );
    food.reason = "这类鱼肉通常富含 Omega-3，对长痘人群可能相对友好。";
  }

  if (
    combined.includes("blueberry") ||
    combined.includes("berries") ||
    combined.includes("strawberry") ||
    combined.includes("蓝莓") ||
    combined.includes("莓果") ||
    combined.includes("草莓")
  ) {
    setFactor(
      "fiber_low_gl_whole_food",
      2,
      "莓果通常属于低升糖完整食物，比高糖甜点更适合作为甜味来源。"
    );
    food.reason = "莓果类食物通常低升糖、富含纤维，对长痘人群较友好。";
  }

  if (
    combined.includes("vegetable") ||
    combined.includes("leafy greens") ||
    combined.includes("salad") ||
    combined.includes("broccoli") ||
    combined.includes("spinach") ||
    combined.includes("蔬菜") ||
    combined.includes("绿叶菜") ||
    combined.includes("沙拉") ||
    combined.includes("西兰花") ||
    combined.includes("菠菜")
  ) {
    setFactor(
      "fiber_low_gl_whole_food",
      3,
      "蔬菜提供膳食纤维与较低升糖负荷，有助于改善整餐结构。"
    );
    food.reason = "蔬菜通常提供膳食纤维与较低升糖负荷，对长痘人群较友好。";
  }

  const hasPositiveOnly = food.factors.every((f) => f.factor_score <= 0);
  const isSugarFood =
    combined.includes("番茄酱") ||
    combined.includes("甜酱") ||
    combined.includes("奶茶") ||
    combined.includes("甜点") ||
    combined.includes("蛋糕") ||
    combined.includes("甜饮");

  if (isSugarFood && hasPositiveOnly) {
    setFactor("added_sugar", -1, "含糖调味品或甜饮存在添加糖暴露。");
  }
}

function normalizeFood(rawFood: unknown): FoodResult {
  const food = rawFood as Record<string, unknown>;
  const factors = normalizeFactors(food?.factors);
  const estimatedPortion = normalizePortion(food?.estimated_portion);

  const result: FoodResult = {
    food_name: String(food?.food_name || "未知食物"),
    estimated_amount: String(food?.estimated_amount || "未能明确估计"),
    estimated_portion: estimatedPortion,
    base_acne_score: 0,
    acne_score: 0,
    impact: "neutral",
    factors,
    reason:
      String(food?.reason || "") ||
      "根据图片或文字描述，无法给出更具体的原因。",
  };

  applyHardRules(result);
  recalculateFoodScore(result);

  if (result.acne_score > 0) {
    const isRestricted =
      result.food_name.includes("番茄酱") ||
      result.food_name.includes("甜酱") ||
      result.food_name.includes("奶茶") ||
      result.food_name.includes("甜点") ||
      result.food_name.includes("蛋糕") ||
      result.food_name.includes("甜饮");

    if (isRestricted) {
      result.factors = result.factors.map((factor) => {
        if (factor.factor_score > 0) {
          return { ...factor, factor_score: 0, direction: "neutral" };
        }
        return factor;
      });
      recalculateFoodScore(result);
    }
  }

  return result;
}

function normalizeResult(raw: unknown): AnalyzeResult {
  const data = raw as Record<string, unknown>;
  const foods = Array.isArray(data?.foods)
    ? data.foods.map(normalizeFood)
    : [];

  const mealScore = foods.reduce((total, food) => total + food.acne_score, 0);
  const acneImpact = getImpactByScore(mealScore);

  const summary =
    acneImpact === "positive"
      ? "这次记录整体对长痘管理偏正向，主要来自低升糖完整食物、膳食纤维或 Omega-3 等信号。"
      : acneImpact === "negative"
        ? "这次记录整体对长痘管理偏负向，主要风险来自高升糖负荷、添加糖、乳制品或高度加工食物等因素。"
        : "这次记录整体对长痘管理偏中性，正向和负向因素相对接近。";

  const confidence = ["high", "medium", "low"].includes(
    String(data?.confidence)
  )
    ? (String(data?.confidence) as Confidence)
    : "medium";

  return {
    meal_score: mealScore,
    acne_impact: acneImpact,
    confidence,
    summary: String(data?.summary || summary),
    foods,
    suggestion:
      String(data?.suggestion || "") ||
      "建议减少高糖、高油炸、高加工食物的频率，并增加低升糖、富含纤维和 Omega-3 的食物。",
  };
}

export async function POST(request: Request) {
  try {
    if (!process.env.DASHSCOPE_API_KEY) {
      return Response.json(
        { error: "Missing DASHSCOPE_API_KEY" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const image = formData.get("image") as File | null;
    const textDescription = String(
      formData.get("text_description") || ""
    ).trim();

    if (!image && !textDescription) {
      return Response.json(
        { error: "Please upload an image or enter food text" },
        { status: 400 }
      );
    }

    let imageContent: {
      type: "image_url";
      image_url: { url: string };
    } | null = null;

    if (image) {
      const bytes = await image.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64Image = buffer.toString("base64");
      const mimeType = image.type || "image/jpeg";

      imageContent = {
        type: "image_url",
        image_url: {
          url: `data:${mimeType};base64,${base64Image}`,
        },
      };
    }

    const inputMode = image && textDescription
      ? "image_and_text"
      : image
        ? "image_only"
        : "text_only";

    const userText =
      inputMode === "image_and_text"
        ? `用户补充描述（份量、隐藏配料、烹饪方式、酱料、饮品、糖量等）：${textDescription}\n\n若图片与文字冲突，优先相信用户文字，尤其是份量和配料。`
        : inputMode === "text_only"
          ? `用户文字描述：${textDescription}`
          : "用户没有补充文字描述，请只根据图片判断。";

    const content: Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    > = [
      {
        type: "text",
        text: `
You are Acne Impact AI for SkinScore.

Analyze whether the visible or described foods may have a positive, negative, or neutral impact on acne-prone skin.
This is NOT a medical diagnosis. Use cautious wording such as "may", "could", "is associated with".

Return ONLY valid JSON. No markdown. No extra text.
Use Simplified Chinese for summary, reason, explanation, suggestion, estimated_amount, factor_name.
Use English field names exactly as specified.

Input mode: ${inputMode}
${userText}

When image and text both exist:
- Image identifies visible foods
- Text supplements portion, hidden ingredients, cooking method, sauces, drinks, sugar amount
- If image and text conflict, trust user text, especially portion and ingredients

Each food MUST analyze exactly these 5 fixed factors. Do NOT add other factors:

1. factor_key: "glycemic_load_refined_carbs"
   factor_name: "高升糖负荷 / 精制碳水"
   factor_score range: -4 to 0
   Examples: white rice, white bread, fries, desserts, refined staples

2. factor_key: "added_sugar"
   factor_name: "添加糖暴露"
   factor_score range: -3 to 0
   Examples: milk tea, sweet drinks, desserts, syrup, ketchup, sweet sauces

3. factor_key: "dairy_whey"
   factor_name: "乳制品 / 乳清暴露"
   factor_score range: -3 to 0
   Examples: milk, skim milk, whey protein, milk in milk tea
   Do NOT auto-penalize plain yogurt or cheese unless clearly sweetened

4. factor_key: "fiber_low_gl_whole_food"
   factor_name: "膳食纤维 / 低升糖完整食物"
   factor_score range: 0 to 3
   Examples: vegetables, leafy greens, legumes, oats, whole grains, berries

5. factor_key: "omega3"
   factor_name: "Omega-3 保护信号"
   factor_score range: 0 to 2
   Examples: salmon, sardines, mackerel

Portion rules:
- estimated_portion.label: "tiny" | "small" | "medium" | "large" | "very_large"
- multipliers: tiny=0.25, small=0.5, medium=1, large=1.5, very_large=2
- A small piece of fried chicken must score less than a large portion
- A large bowl of blueberries must score more than a few berries

Scoring:
- base_acne_score = sum of 5 factor scores
- acne_score = base_acne_score × portion multiplier, clamp -10 to 10
- meal_score = sum of all food acne_score values
- impact: positive if acne_score >= 2, negative if <= -2, else neutral
- Ketchup, sweet sauces, milk tea, sweet drinks, desserts cannot get positive acne_score
- Fried chicken: explain via fixed factors, not generic "fried causes acne"
- All numbers must be valid JSON numbers without plus signs

Return JSON:
{
  "meal_score": number,
  "acne_impact": "positive" | "negative" | "neutral",
  "confidence": "high" | "medium" | "low",
  "summary": string,
  "foods": [
    {
      "food_name": string,
      "estimated_amount": string,
      "estimated_portion": {
        "label": "tiny" | "small" | "medium" | "large" | "very_large",
        "multiplier": number,
        "explanation": string
      },
      "base_acne_score": number,
      "acne_score": number,
      "impact": "positive" | "negative" | "neutral",
      "factors": [
        {
          "factor_key": "glycemic_load_refined_carbs" | "added_sugar" | "dairy_whey" | "fiber_low_gl_whole_food" | "omega3",
          "factor_name": string,
          "direction": "positive" | "negative" | "neutral",
          "factor_score": number,
          "explanation": string
        }
      ],
      "reason": string
    }
  ],
  "suggestion": string
}
        `,
      },
    ];

    if (imageContent) {
      content.push(imageContent);
    }

    const response = await fetch(
      "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "qwen-vl-plus",
          temperature: 0.1,
          max_tokens: 2000,
          messages: [{ role: "user", content }],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("DashScope API error:", data);
      return Response.json(
        {
          error:
            data?.error?.message ||
            data?.message ||
            "DashScope API request failed",
        },
        { status: 500 }
      );
    }

    const text = data.choices?.[0]?.message?.content;

    if (!text || typeof text !== "string") {
      console.error("Empty DashScope response:", data);
      return Response.json({ error: "Empty AI response" }, { status: 500 });
    }

    const rawResult = extractJson(text);
    const result = normalizeResult(rawResult);

    return Response.json(result);
  } catch (error: unknown) {
    console.error("DashScope analyze error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to analyze food with DashScope";

    return Response.json({ error: message }, { status: 500 });
  }
}
