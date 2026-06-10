"use client";

import { useState } from "react";
import {
  type MealRecord,
  formatScore,
  formatTime,
  getImpactColor,
  getImpactLabel,
  getScoreColor,
} from "@/lib/mealRecords";

const DEFAULT_VISIBLE = 3;

type TodayRecordsListProps = {
  records: MealRecord[];
  onDelete: (recordId: string) => void;
};

export default function TodayRecordsList({
  records,
  onDelete,
}: TodayRecordsListProps) {
  const [expanded, setExpanded] = useState(false);

  if (records.length === 0) {
    return (
      <div className="mt-5 rounded-3xl bg-emerald-50/80 p-5 text-sm leading-6 text-emerald-800/65">
        暂无记录。每次上传或输入食物后，系统会自动保存到这里。
      </div>
    );
  }

  const visibleRecords = expanded ? records : records.slice(0, DEFAULT_VISIBLE);
  const hiddenCount = Math.max(records.length - DEFAULT_VISIBLE, 0);

  return (
    <div className="mt-5 space-y-3">
      {visibleRecords.map((record) => (
        <div
          key={record.id}
          className="flex items-center gap-4 rounded-3xl bg-emerald-50/80 p-4"
        >
          {record.image_preview_url ? (
            <img
              src={record.image_preview_url}
              alt="餐食"
              className="h-16 w-16 rounded-2xl object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-xl text-emerald-600">
              ✎
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium">
                {record.result.foods.map((food) => food.food_name).join("、")}
              </p>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${getImpactColor(
                  record.result.acne_impact
                )}`}
              >
                {getImpactLabel(record.result.acne_impact)}
              </span>
            </div>
            <p className="mt-1 text-sm text-emerald-800/60">
              {formatTime(record.created_at)}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <p
              className={`text-lg font-bold ${getScoreColor(
                record.result.meal_score
              )}`}
            >
              {formatScore(record.result.meal_score)}
            </p>
            <button
              type="button"
              onClick={() => onDelete(record.id)}
              className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
            >
              删除
            </button>
          </div>
        </div>
      ))}

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="w-full rounded-2xl border border-emerald-200/80 bg-white/80 py-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
        >
          {expanded ? "收起记录" : `展开全部（还有 ${hiddenCount} 条）`}
        </button>
      )}
    </div>
  );
}
