"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function validateForm() {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail.includes("@")) {
      setError("请输入正确的邮箱地址。");
      return null;
    }

    if (password.length < 6) {
      setError("密码至少需要 6 位。");
      return null;
    }

    return normalizedEmail;
  }

  async function handleLogin() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const normalizedEmail = validateForm();

      if (!normalizedEmail) {
        return;
      }

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (loginError) {
        setError(loginError.message || "登录失败，请检查邮箱和密码。");
        return;
      }

      setMessage("登录成功，正在返回首页...");
      window.location.href = "/";
    } catch {
      setError("登录失败，请稍后再试。");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const normalizedEmail = validateForm();

      if (!normalizedEmail) {
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
      });

      if (signUpError) {
        setError(signUpError.message || "注册失败，请稍后再试。");
        return;
      }

      if (!data.session) {
        setError(
          "账号已创建，但当前 Supabase 仍要求邮箱确认。请去 Supabase 的 Email Provider 里关闭 Confirm email。"
        );
        return;
      }

      setMessage("注册并登录成功，正在返回首页...");
      window.location.href = "/";
    } catch {
      setError("注册失败，请稍后再试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-cyan-50 to-white px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-md">
        <Link href="/" className="text-sm font-semibold text-emerald-700">
          ← 返回首页
        </Link>

        <header className="mt-8">
          <h1 className="text-3xl font-black tracking-tight text-emerald-950">
            邮箱登录
          </h1>

          <p className="mt-3 text-sm leading-6 text-emerald-900/70">
            使用邮箱和密码登录。开发阶段不发送邮件，避免被 Supabase 邮件限流卡住。
          </p>
        </header>

        <section className="mt-10 rounded-[2rem] bg-white/80 p-6 shadow-sm backdrop-blur">
          <div>
            <label className="text-sm font-bold text-emerald-950">
              邮箱地址
            </label>

            <input
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError("");
                setMessage("");
              }}
              disabled={loading}
              placeholder="请输入邮箱，例如 you@example.com"
              className="mt-3 w-full rounded-2xl border border-emerald-100 bg-emerald-50/50 px-4 py-4 text-sm outline-none transition focus:border-emerald-300 disabled:text-slate-400"
            />
          </div>

          <div className="mt-6">
            <label className="text-sm font-bold text-emerald-950">
              密码
            </label>

            <input
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
                setMessage("");
              }}
              disabled={loading}
              type="password"
              placeholder="请输入至少 6 位密码"
              className="mt-3 w-full rounded-2xl border border-emerald-100 bg-emerald-50/50 px-4 py-4 text-sm outline-none transition focus:border-emerald-300 disabled:text-slate-400"
            />
          </div>

          {message && (
            <p className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-700">
              {message}
            </p>
          )}

          {error && (
            <p className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm leading-6 text-rose-600">
              {error}
            </p>
          )}

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              onClick={handleLogin}
              disabled={loading || !email.trim() || !password.trim()}
              className="rounded-3xl bg-emerald-500 py-4 text-base font-bold text-white shadow-sm transition hover:bg-emerald-600 disabled:bg-slate-300"
            >
              {loading ? "处理中..." : "登录"}
            </button>

            <button
              onClick={handleSignUp}
              disabled={loading || !email.trim() || !password.trim()}
              className="rounded-3xl bg-white py-4 text-base font-bold text-emerald-700 shadow-sm ring-1 ring-emerald-100 transition hover:bg-emerald-50 disabled:text-slate-300"
            >
              注册并登录
            </button>
          </div>

          <p className="mt-5 text-center text-xs leading-5 text-slate-400">
            第一次使用请点“注册并登录”；已有账号请点“登录”。
          </p>
        </section>
      </div>
    </main>
  );
}