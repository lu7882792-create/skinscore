"use client";

import { useState } from "react";
import Link from "next/link";
import {
  type AnalyzeResult,
  type MealRecord,
  formatScore,
  getImpactColor,
  getImpactLabel,
  getPortionLabel,
  getScoreColor,
} from "@/lib/mealRecords";
import { saveMealRecord } from "@/lib/recordsClient";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function UploadPage() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textDescription, setTextDescription] = useState("");
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const dataUrl = await readFileAsDataUrl(file);
    setSelectedFile(file);
    setFileName(file.name);
    setPreviewUrl(dataUrl);
    setResult(null);
    setError("");
    setSaved(false);
  }

  async function handleAnalyze() {
    if (!selectedFile && !textDescription.trim()) {
      setError("请上传图片，或输入你吃了什么。");
      return;
    }

    try {
      setIsAnalyzing(true);
      setError("");
      setResult(null);
      setSaved(false);

      const formData = new FormData();
      if (selectedFile) formData.append("image", selectedFile);
      if (textDescription.trim()) {
        formData.append("text_description", textDescription.trim());
      }

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "分析失败");
      }

      setResult(data);

      const record: MealRecord = {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        input_text: textDescription.trim(),
        image_preview_url: previewUrl,
        result: data,
      };

      await saveMealRecord(record);
      setSaved(true);
    } catch (err) {
      console.error(err);
      setError("分析失败。请检查 DASHSCOPE_API_KEY、网络或终端报错。");
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-emerald-50 via-green-50 to-lime-100 px-6 py-8 text-emerald-950">
      <div className="pointer-events-none absolute -left-20 top-10 h-56 w-56 rounded-full bg-emerald-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-20 h-64 w-64 rounded-full bg-lime-300/25 blur-3xl" />

      <div className="relative mx-auto max-w-md">
        <header className="mb-8">
          <Link
            href="/"
            className="text-sm font-medium text-emerald-700/80 transition hover:text-emerald-900"
          >
            ← 返回首页
          </Link>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-emerald-950">
            长痘影响分析
          </h1>

          <p className="mt-2 text-sm leading-6 text-emerald-800/70">
            上传食物图片、输入文字，或两者一起提交。系统会分析这次进食对长痘人群的潜在正向、负向或中性影响。
          </p>
        </header>

        <section className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_rgba(16,185,129,0.12)] backdrop-blur">
          <label
            htmlFor="meal-photo"
            className="flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border-2 border-dashed border-emerald-200 bg-emerald-50/70 p-6 text-center transition hover:bg-emerald-50"
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="食物预览"
                className="h-64 w-full rounded-3xl object-cover"
              />
            ) : (
              <div>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl text-emerald-600 shadow-sm">
                  +
                </div>
                <p className="mt-4 font-semibold">上传食物照片</p>
                <p className="mt-2 text-sm text-emerald-700/60">
                  支持 JPG、PNG、WEBP
                </p>
              </div>
            )}
          </label>

          <input
            id="meal-photo"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {fileName && (
            <p className="mt-4 truncate text-center text-sm text-emerald-700/60">
              已选择：{fileName}
            </p>
          )}

          <div className="mt-6">
            <label className="text-sm font-semibold text-emerald-900">
              或者直接输入食物
            </label>

            <textarea
              value={textDescription}
              onChange={(event) => {
                setTextDescription(event.target.value);
                setResult(null);
                setSaved(false);
              }}
              placeholder="例如：一小块炸鸡，两勺番茄酱；或者：一大碗蓝莓酸奶"
              className="mt-3 min-h-28 w-full resize-none rounded-3xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm leading-6 outline-none transition focus:border-emerald-300 focus:bg-white"
            />
          </div>

          <button
            disabled={(!previewUrl && !textDescription.trim()) || isAnalyzing}
            onClick={handleAnalyze}
            className="mt-6 w-full rounded-3xl bg-emerald-700 py-4 text-base font-semibold text-white shadow-[0_12px_30px_rgba(5,150,105,0.25)] transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-300"
          >
            {isAnalyzing ? "分析中..." : "开始分析"}
          </button>

          {saved && (
            <p className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">
              已保存到今日记录，首页累计得分已更新。登录后数据会同步到你的账号。
            </p>
          )}

          {error && (
            <p className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm text-rose-600">
              {error}
            </p>
          )}
        </section>

        {result && (
          <>
            <section className="mt-6 rounded-[2rem] border border-white/70 bg-white/85 p-8 text-center shadow-[0_20px_60px_rgba(16,185,129,0.1)] backdrop-blur">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getImpactColor(
                    result.acne_impact
                  )}`}
                >
                  {getImpactLabel(result.acne_impact)}影响
                </span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  置信度：{result.confidence}
                </span>
              </div>

              <p className="mt-6 text-sm font-medium text-emerald-800/60">
                本次长痘影响得分
              </p>

              <div
                className={`mt-4 text-7xl font-bold tracking-tight ${getScoreColor(
                  result.meal_score
                )}`}
              >
                {formatScore(result.meal_score)}
              </div>

              <p className="mt-5 text-sm leading-6 text-emerald-800/70">
                {result.summary}
              </p>
            </section>

            <section className="mt-6 rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(16,185,129,0.1)] backdrop-blur">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">识别到的食物</h2>
                <span className="text-sm text-emerald-700/50">
                  {result.foods.length} 项
                </span>
              </div>

              <div className="mt-5 space-y-4">
                {result.foods.map((food) => (
                  <div
                    key={`${food.food_name}-${food.acne_score}`}
                    className="rounded-3xl bg-emerald-50/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold">{food.food_name}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getImpactColor(
                              food.impact
                            )}`}
                          >
                            {getImpactLabel(food.impact)}影响
                          </span>
                          <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700/70">
                            {getPortionLabel(food.estimated_portion.label)}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <p
                          className={`text-xl font-bold ${getScoreColor(
                            food.acne_score
                          )}`}
                        >
                          {formatScore(food.acne_score)}
                        </p>
                        <p className="mt-1 text-xs text-emerald-700/50">
                          基础 {formatScore(food.base_acne_score)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl bg-white p-3 text-sm text-emerald-800/70">
                      <p>估计份量：{food.estimated_amount}</p>
                      <p className="mt-1">
                        份量系数：×{food.estimated_portion.multiplier}
                      </p>
                      <p className="mt-1">{food.estimated_portion.explanation}</p>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-emerald-800/70">
                      {food.reason}
                    </p>

                    <div className="mt-5 space-y-3">
                      <p className="text-sm font-semibold text-emerald-900">
                        五大固定因子
                      </p>

                      {food.factors.map((factor) => (
                        <div
                          key={factor.factor_key}
                          className="rounded-2xl bg-white p-4 text-sm shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium text-emerald-900">
                              {factor.factor_name}
                            </p>
                            <div className="flex shrink-0 items-center gap-2">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getImpactColor(
                                  factor.direction
                                )}`}
                              >
                                {getImpactLabel(factor.direction)}
                              </span>
                              <span
                                className={`text-xs font-bold ${getScoreColor(
                                  factor.factor_score
                                )}`}
                              >
                                {formatScore(factor.factor_score)}
                              </span>
                            </div>
                          </div>
                          <p className="mt-2 leading-6 text-emerald-800/65">
                            {factor.explanation}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-6 rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(16,185,129,0.1)] backdrop-blur">
              <h2 className="text-lg font-semibold">饮食建议</h2>
              <p className="mt-3 text-sm leading-6 text-emerald-800/70">
                {result.suggestion}
              </p>
            </section>

            <Link
              href="/"
              className="mt-6 block w-full rounded-3xl bg-emerald-700 py-4 text-center text-base font-semibold text-white shadow-[0_12px_30px_rgba(5,150,105,0.25)] transition hover:bg-emerald-800"
            >
              查看今日首页
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
