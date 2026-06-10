
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("正在完成登录...");

  useEffect(() => {
    async function handleCallback() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (!code) {
        setMessage("没有找到登录凭证，请重新登录。");
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error(error);
        setMessage("登录失败，请重新发送登录链接。");
        return;
      }

      window.location.href = "/";
    }

    handleCallback();
  }, []);

  return (
    <main className="min-h-screen bg-emerald-50 px-6 py-20 text-center text-slate-900">
      <h1 className="text-2xl font-black text-emerald-950">{message}</h1>
      <p className="mt-4 text-sm text-emerald-800/70">
        如果页面长时间没有跳转，请返回登录页重新发送链接。
      </p>
    </main>
  );
}