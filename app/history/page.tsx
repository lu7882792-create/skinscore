"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AuthBar from "@/components/AuthBar";
import {
  type ImpactDirection,
  type MealRecord,
  formatDateTime,
  formatScore,
  getImpactColor,
  getImpactLabel,
  getScoreColor,
  isToday,
} from "@/lib/mealRecords";
import {
  AUTH_UPDATED_EVENT,
  RECORDS_UPDATED_EVENT,
  deleteMealRecord,
  fetchAllRecords,
} from "@/lib/recordsClient";

type FilterOption = "all" | "today" | ImpactDirection;

const FILTER_OPTIONS: { value: FilterOption; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "today", label: "今天" },
  { value: "positive", label: "正向" },
  { value: "negative", label: "负向" },
  { value: "neutral", label: "中性" },
];

function matchesSearch(record: MealRecord, query: string) {
  if (!query.trim()) return true;

  const keyword = query.trim().toLowerCase();
  const foodNames = record.result.foods
    .map((food) => food.food_name)
    .join(" ")
    .toLowerCase();

  return (
    foodNames.includes(keyword) ||
    record.input_text.toLowerCase().includes(keyword) ||
    record.result.summary.toLowerCase().includes(keyword) ||
    formatDateTime(record.created_at).includes(keyword)
  );
}

function matchesFilter(record: MealRecord, filter: FilterOption) {
  if (filter === "all") return true;
  if (filter === "today") return isToday(record.created_at);
  return record.result.acne_impact === filter;
}

export default function HistoryPage() {
  const [records, setRecords] = useState<MealRecord[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterOption>("all");

  const syncRecords = useCallback(async () => {
    const nextRecords = await fetchAllRecords();
    setRecords(nextRecords);
  }, []);

  useEffect(() => {
    syncRecords();

    window.addEventListener("storage", syncRecords);
    window.addEventListener(RECORDS_UPDATED_EVENT, syncRecords);
    window.addEventListener(AUTH_UPDATED_EVENT, syncRecords);

    return () => {
      window.removeEventListener("storage", syncRecords);
      window.removeEventListener(RECORDS_UPDATED_EVENT, syncRecords);
      window.removeEventListener(AUTH_UPDATED_EVENT, syncRecords);
    };
  }, [syncRecords]);

  const filteredRecords = useMemo(
    () =>
      records.filter(
        (record) => matchesSearch(record, search) && matchesFilter(record, filter)
      ),
    [records, search, filter]
  );

  async function handleDelete(recordId: string) {
    await deleteMealRecord(recordId);
    await syncRecords();
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-emerald-100 via-green-50 to-lime-100 px-6 py-8 text-emerald-950">
      <div className="pointer-events-none absolute -left-20 top-10 h-56 w-56 rounded-full bg-emerald-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-20 h-64 w-64 rounded-full bg-lime-300/25 blur-3xl" />

      <div className="relative mx-auto max-w-md">
        <header className="mb-4">
          <Link
            href="/"
            className="text-sm font-medium text-emerald-700/80 transition hover:text-emerald-900"
          >
            ← 返回首页
          </Link>

          <h1 className="mt-4 text-3xl font-bold tracking-tight">历史记录</h1>
          <p className="mt-2 text-sm leading-6 text-emerald-800/70">
            查看所有分析过的进食记录，支持搜索与筛选。
          </p>
        </header>

        <AuthBar />

        <section className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_20px_60px_rgba(16,185,129,0.1)] backdrop-blur">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索食物名、输入文字、时间或摘要..."
            className="w-full rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm outline-none transition focus:border-emerald-300 focus:bg-white"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  filter === option.value
                    ? "bg-emerald-700 text-white"
                    : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">全部记录</h2>
            <span className="text-sm text-emerald-700/50">
              {filteredRecords.length} 条
            </span>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="rounded-[2rem] border border-white/70 bg-white/80 p-6 text-sm leading-6 text-emerald-800/65 shadow-sm">
              没有找到匹配的记录。
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRecords.map((record) => (
                <article
                  key={record.id}
                  className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-[0_16px_50px_rgba(16,185,129,0.08)] backdrop-blur"
                >
                  <div className="flex gap-4">
                    {record.image_preview_url ? (
                      <img
                        src={record.image_preview_url}
                        alt="餐食"
                        className="h-20 w-20 rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-50 text-2xl text-emerald-600">
                        ✎
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">
                            {record.result.foods
                              .map((food) => food.food_name)
                              .join("、")}
                          </p>
                          <p className="mt-1 text-sm text-emerald-800/60">
                            {formatDateTime(record.created_at)}
                          </p>
                        </div>

                        <div className="text-right">
                          <p
                            className={`text-xl font-bold ${getScoreColor(
                              record.result.meal_score
                            )}`}
                          >
                            {formatScore(record.result.meal_score)}
                          </p>
                          <span
                            className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getImpactColor(
                              record.result.acne_impact
                            )}`}
                          >
                            {getImpactLabel(record.result.acne_impact)}
                          </span>
                        </div>
                      </div>

                      {record.input_text && (
                        <p className="mt-3 rounded-2xl bg-emerald-50/80 px-3 py-2 text-sm text-emerald-800/70">
                          输入：{record.input_text}
                        </p>
                      )}

                      <p className="mt-3 text-sm leading-6 text-emerald-800/65">
                        {record.result.summary}
                      </p>

                      <button
                        type="button"
                        onClick={() => handleDelete(record.id)}
                        className="mt-4 rounded-full bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
                      >
                        删除记录
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
