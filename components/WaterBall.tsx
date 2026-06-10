"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatScore } from "@/lib/mealRecords";

type WaterBallProps = {
  score: number;
  hasRecords: boolean;
  recordCount: number;
  foodCount: number;
};

type BallTheme = "neutral" | "positive" | "negative";

type ThemePalette = {
  surface: string;
  top: string;
  mid: string;
  bottom: string;
  foam: string;
  glow: string;
  starMain: string;
  starAccent: string;
  scoreText: string;
  scoreGlow: string;
};

const STARS = [
  { x: 12, y: 10, s: 2.2, d: 0, layer: "air" },
  { x: 78, y: 14, s: 1.6, d: 0.8, layer: "air" },
  { x: 20, y: 22, s: 1.2, d: 1.4, layer: "air" },
  { x: 86, y: 28, s: 1.8, d: 0.3, layer: "air" },
  { x: 14, y: 38, s: 1, d: 2.1, layer: "air" },
  { x: 82, y: 40, s: 1.4, d: 1.1, layer: "air" },
  { x: 24, y: 8, s: 2.2, d: 0.5, layer: "air" },
  { x: 18, y: 62, s: 1.3, d: 1.7, layer: "water" },
  { x: 34, y: 74, s: 2, d: 0.2, layer: "water" },
  { x: 56, y: 68, s: 1.5, d: 1.3, layer: "water" },
  { x: 76, y: 78, s: 1.1, d: 2.4, layer: "water" },
  { x: 42, y: 82, s: 1.8, d: 0.9, layer: "water" },
  { x: 64, y: 58, s: 1.2, d: 1.9, layer: "water" },
  { x: 26, y: 88, s: 2.4, d: 0.6, layer: "water" },
  { x: 88, y: 64, s: 1, d: 2.8, layer: "water" },
] as const;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getBallTheme(score: number, hasRecords: boolean): BallTheme {
  if (!hasRecords || score === 0) return "neutral";
  if (score > 0) return "positive";
  return "negative";
}

function getThemePalette(theme: BallTheme): ThemePalette {
  if (theme === "positive") {
    return {
      surface: "rgba(167, 243, 208, 0.55)",
      top: "rgba(110, 231, 183, 0.42)",
      mid: "rgba(52, 211, 153, 0.3)",
      bottom: "rgba(16, 185, 129, 0.22)",
      foam: "rgba(255, 255, 255, 0.65)",
      glow: "rgba(110, 231, 183, 0.28)",
      starMain: "rgba(255, 255, 255, 0.95)",
      starAccent: "rgba(134, 239, 172, 0.9)",
      scoreText: "#059669",
      scoreGlow: "0 0 20px rgba(110, 231, 183, 0.55)",
    };
  }

  if (theme === "negative") {
    return {
      surface: "rgba(254, 205, 211, 0.55)",
      top: "rgba(251, 182, 193, 0.42)",
      mid: "rgba(251, 113, 133, 0.28)",
      bottom: "rgba(244, 114, 182, 0.2)",
      foam: "rgba(255, 255, 255, 0.62)",
      glow: "rgba(251, 113, 133, 0.26)",
      starMain: "rgba(255, 255, 255, 0.92)",
      starAccent: "rgba(253, 186, 116, 0.88)",
      scoreText: "#e11d48",
      scoreGlow: "0 0 20px rgba(251, 113, 133, 0.5)",
    };
  }

  return {
    surface: "rgba(191, 219, 254, 0.5)",
    top: "rgba(147, 197, 253, 0.38)",
    mid: "rgba(125, 211, 252, 0.28)",
    bottom: "rgba(96, 165, 250, 0.2)",
    foam: "rgba(255, 255, 255, 0.68)",
    glow: "rgba(147, 197, 253, 0.26)",
    starMain: "rgba(255, 255, 255, 0.95)",
    starAccent: "rgba(186, 230, 253, 0.9)",
    scoreText: "#64748b",
    scoreGlow: "0 0 18px rgba(191, 219, 254, 0.55)",
  };
}

function getBallLevel(score: number, hasRecords: boolean) {
  if (!hasRecords) return 50;
  return clamp(50 + score * 2, 8, 92);
}

function buildOceanPath(amp: number, baseline: number) {
  const crest = baseline - amp;
  const trough = baseline + amp * 0.75;

  return `
    M0 ${baseline}
    C 60 ${crest} 120 ${trough} 180 ${baseline}
    C 240 ${crest} 300 ${trough} 360 ${baseline}
    C 420 ${crest} 480 ${trough} 540 ${baseline}
    C 600 ${crest} 660 ${trough} 720 ${baseline}
    L 720 80 L 0 80 Z
  `;
}

function buildFoamPath(amp: number, baseline: number) {
  const crest = baseline - amp * 0.85;

  return `
    M0 ${baseline - 2}
    C 60 ${crest} 120 ${baseline + 6} 180 ${baseline - 2}
    C 240 ${crest} 300 ${baseline + 6} 360 ${baseline - 2}
    C 420 ${crest} 480 ${baseline + 6} 540 ${baseline - 2}
    C 600 ${crest} 660 ${baseline + 6} 720 ${baseline - 2}
    L 720 36 L 0 36 Z
  `;
}

function WaveLayer({
  color,
  foam,
  duration,
  reverse,
  delay,
  opacity,
  boost,
}: {
  color: string;
  foam: string;
  duration: number;
  reverse?: boolean;
  delay?: number;
  opacity?: number;
  boost: number;
}) {
  const amp = 10 + boost * 8;
  const baseline = 28;
  const bodyPath = buildOceanPath(amp, baseline);
  const foamPath = buildFoamPath(amp, baseline);

  return (
    <div
      className={`wave-track ${reverse ? "wave-track-reverse" : ""}`}
      style={
        {
          "--wave-duration": `${duration / boost}s`,
          "--wave-delay": `${delay ?? 0}s`,
          opacity: opacity ?? 1,
        } as React.CSSProperties
      }
    >
      {[0, 1].map((index) => (
        <svg
          key={index}
          className="wave-svg"
          viewBox="0 0 720 80"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path d={bodyPath} fill={color} />
          <path d={foamPath} fill={foam} />
        </svg>
      ))}
    </div>
  );
}

function Starfield({
  theme,
  layer,
  palette,
}: {
  theme: BallTheme;
  layer: "air" | "water";
  palette: ThemePalette;
}) {
  const stars = useMemo(
    () => STARS.filter((star) => star.layer === layer),
    [layer]
  );

  return (
    <div className={`starfield starfield-${layer}`} aria-hidden>
      {stars.map((star, index) => (
        <span
          key={`${layer}-${index}`}
          className={`star-dot star-dot-${theme}`}
          style={
            {
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.s}px`,
              height: `${star.s}px`,
              animationDelay: `${star.d}s`,
              "--star-main": palette.starMain,
              "--star-accent": palette.starAccent,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

export default function WaterBall({
  score,
  hasRecords,
  recordCount,
  foodCount,
}: WaterBallProps) {
  const [waveBoost, setWaveBoost] = useState(1);
  const decayTimer = useRef<number | null>(null);
  const level = getBallLevel(score, hasRecords);
  const theme = getBallTheme(score, hasRecords);
  const palette = getThemePalette(theme);

  const handleClick = useCallback(() => {
    if (decayTimer.current) {
      window.clearTimeout(decayTimer.current);
    }

    setWaveBoost(3.2);

    decayTimer.current = window.setTimeout(() => {
      setWaveBoost(1);
      decayTimer.current = null;
    }, 1600);
  }, []);

  useEffect(() => {
    return () => {
      if (decayTimer.current) {
        window.clearTimeout(decayTimer.current);
      }
    };
  }, []);

  return (
    <div className="waterball-stage">
      <div
        className="waterball-ground-shadow"
        style={{
          background: `radial-gradient(ellipse, ${palette.glow}, transparent 72%)`,
        }}
      />

      <button
        type="button"
        onClick={handleClick}
        className="waterball-float group relative mx-auto block h-[17.5rem] w-[17.5rem] cursor-pointer focus:outline-none"
        aria-label="今日得分水球"
      >
        <div className={`sphere-shell sphere-theme-${theme}`}>
          <div className="sphere-cavity">
            <Starfield theme={theme} layer="air" palette={palette} />
          </div>

          <div
            className="sphere-water"
            style={{
              height: `${level}%`,
              background: `
                radial-gradient(ellipse 130% 90% at 50% 0%, ${palette.top} 0%, transparent 58%),
                linear-gradient(180deg, ${palette.top} 0%, ${palette.mid} 48%, ${palette.bottom} 100%)
              `,
            }}
          >
            <Starfield theme={theme} layer="water" palette={palette} />
            <div className="sphere-water-meniscus" />

            <div
              className="wave-surface"
              style={
                {
                  "--wave-bob": `${waveBoost * 5}px`,
                } as React.CSSProperties
              }
            >
              <WaveLayer
                color={palette.surface}
                foam={palette.foam}
                duration={5.5}
                boost={waveBoost}
                opacity={0.88}
              />
              <WaveLayer
                color={palette.top}
                foam={palette.foam}
                duration={7.2}
                reverse
                delay={0.4}
                boost={waveBoost * 0.85}
                opacity={0.55}
              />
              <WaveLayer
                color={palette.mid}
                foam="rgba(255,255,255,0.35)"
                duration={9}
                delay={0.8}
                boost={waveBoost * 0.7}
                opacity={0.35}
              />
            </div>

            <div className="water-shimmer" />
            <div className="sphere-water-sparkle" />
          </div>
        </div>

        <div className="sphere-score z-20 flex flex-col items-center justify-center text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500/80">
            今日得分
          </p>
          <p
            className="mt-3 text-6xl font-bold tracking-tight"
            style={{
              color: palette.scoreText,
              textShadow: palette.scoreGlow,
            }}
          >
            {formatScore(score)}
          </p>
          <p className="mt-3 text-xs font-medium text-slate-500/75">
            {recordCount} 条记录 · {foodCount} 种食物
          </p>
        </div>
      </button>
    </div>
  );
}
