
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AuthBar from "@/components/AuthBar";
import TodayRecordsList from "@/components/TodayRecordsList";
import WaterBall from "@/components/WaterBall";
import {
  formatScore,
  getScoreColor,
  isToday,
  type MealRecord,
} from "@/lib/mealRecords";
import {
  AUTH_UPDATED_EVENT,
  RECORDS_UPDATED_EVENT,
  deleteMealRecord,
  fetchAllRecords,
} from "@/lib/recordsClient";

function getDashboardMessage(score: number, hasRecords: boolean) {
  if (!hasRecords) {
    return "今天还没有记录，水球从中间开始。每次进食后，今日得分会实时变化。";
  }

  if (score > 0) {
    return "今天整体偏正向，低升糖完整食物、膳食纤维或 Omega-3 信号占优。";
  }

  if (score < 0) {
    return "今天整体偏负向，高升糖负荷、添加糖、乳制品或加工食物信号占优。";
  }

  return "今天正向和负向信号基本抵消，整体偏中性。";
}

export default function Home() {
  const [records, setRecords] = useState<MealRecord[]>([]);

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

  const todayRecords = useMemo(
    () => records.filter((record) => isToday(record.created_at)),
    [records]
  );

  const todayScore = useMemo(
    () =>
      todayRecords.reduce(
        (total, record) => total + record.result.meal_score,
        0
      ),
    [todayRecords]
  );

  const todayFoods = useMemo(
    () =>
      todayRecords.flatMap((record) =>
        record.result.foods.map((food) => ({
          ...food,
          recordTime: record.created_at,
        }))
      ),
    [todayRecords]
  );

  const bestFood = useMemo(() => {
    const positiveFoods = todayFoods.filter((food) => food.acne_score > 0);
    if (positiveFoods.length === 0) return null;
    return positiveFoods.sort((a, b) => b.acne_score - a.acne_score)[0];
  }, [todayFoods]);

  const worstFood = useMemo(() => {
    const negativeFoods = todayFoods.filter((food) => food.acne_score < 0);
    if (negativeFoods.length === 0) return null;
    return negativeFoods.sort((a, b) => a.acne_score - b.acne_score)[0];
  }, [todayFoods]);

  const hasTodayRecords = todayRecords.length > 0;

  async function handleDelete(recordId: string) {
    await deleteMealRecord(recordId);
    await syncRecords();
  }

  return (
    <main className="forest-bg-layer relative min-h-screen overflow-hidden px-6 py-8 text-emerald-950">
      <div className="pointer-events-none absolute -left-20 top-8 h-64 w-64 rounded-full bg-emerald-400/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 top-1/3 h-56 w-56 rounded-full bg-lime-300/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 h-48 w-48 rounded-full bg-green-300/20 blur-3xl" />

      <div className="relative mx-auto max-w-md">
        <header className="mb-4">
          <p className="text-sm font-medium text-emerald-700/70">今日</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">SkinScore</h1>
          <p className="mt-2 text-sm leading-6 text-emerald-800/70">
            记录每一次进食，累计今天对长痘管理的正向或负向影响。
          </p>
        </header>

        <AuthBar />

        <section className="orb-showcase relative overflow-hidden rounded-[2rem] border p-8 shadow-[0_20px_60px_rgba(148,163,184,0.12)] backdrop-blur-md">
          <div className="orb-showcase-glow pointer-events-none absolute inset-0" />
          <div className="pointer-events-none absolute inset-x-10 top-2 h-28 rounded-full bg-white/50 blur-2xl" />

          <div className="relative z-10 flex flex-col items-center py-2">
            <WaterBall
              score={todayScore}
              hasRecords={hasTodayRecords}
              recordCount={todayRecords.length}
              foodCount={todayFoods.length}
            />

            <p className="mt-6 text-center text-sm leading-6 text-emerald-800/70">
              {getDashboardMessage(todayScore, hasTodayRecords)}
            </p>
          </div>
        </section>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Link
            href="/upload"
            className="rounded-3xl bg-emerald-700 py-4 text-center text-base font-semibold text-white shadow-[0_12px_30px_rgba(5,150,105,0.25)] transition hover:bg-emerald-800"
          >
            添加食物
          </Link>
          <Link
            href="/history"
            className="rounded-3xl border border-emerald-200 bg-white/80 py-4 text-center text-base font-semibold text-emerald-800 shadow-sm transition hover:bg-white"
          >
            历史记录
          </Link>
        </div>

        <section className="mt-6 rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_rgba(16,185,129,0.1)] backdrop-blur">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">食物洞察</h2>
            <span className="text-sm text-emerald-700/50">今日</span>
          </div>

          {!hasTodayRecords ? (
            <div className="mt-5 rounded-3xl bg-emerald-50/80 p-5 text-sm leading-6 text-emerald-800/65">
              今天还没有食物记录。上传图片或输入食物后，这里会显示今日最正向和最负向的食物。
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="rounded-3xl bg-emerald-50/80 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">最友好食物</p>
                    <p className="mt-1 text-sm text-emerald-800/65">
                      {bestFood ? bestFood.food_name : "暂无正向食物"}
                    </p>
                  </div>
                  <p
                    className={`text-xl font-bold ${
                      bestFood ? getScoreColor(bestFood.acne_score) : "text-emerald-300"
                    }`}
                  >
                    {bestFood ? formatScore(bestFood.acne_score) : "--"}
                  </p>
                </div>
              </div>

              <div className="rounded-3xl bg-emerald-50/80 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">最需留意食物</p>
                    <p className="mt-1 text-sm text-emerald-800/65">
                      {worstFood ? worstFood.food_name : "暂无负向食物"}
                    </p>
                  </div>
                  <p
                    className={`text-xl font-bold ${
                      worstFood
                        ? getScoreColor(worstFood.acne_score)
                        : "text-emerald-300"
                    }`}
                  >
                    {worstFood ? formatScore(worstFood.acne_score) : "--"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_rgba(16,185,129,0.1)] backdrop-blur">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">今日记录</h2>
            <span className="text-sm text-emerald-700/50">
              {todayRecords.length} 条
            </span>
          </div>

          <TodayRecordsList records={todayRecords} onDelete={handleDelete} />
        </section>
      </div>
    </main>
  );
}
