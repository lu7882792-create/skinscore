"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthStatus() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshUser() {
    const { data } = await supabase.auth.getUser();
    setEmail(data.user?.email ?? null);
    setLoading(false);
  }

  useEffect(() => {
    refreshUser();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      refreshUser();
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setEmail(null);
    window.location.reload();
  }

  if (loading) {
    return (
      <div className="rounded-3xl bg-white/70 p-4 text-sm text-slate-500">
        正在检查登录状态...
      </div>
    );
  }

  if (!email) {
    return (
      <div className="rounded-3xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">
        未登录：当前数据仅保存在本机。登录后可保存到你的账号。
        <a href="/login" className="ml-2 font-bold text-emerald-700">
          邮箱登录
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
      已登录：{email}
      <button
        onClick={handleLogout}
        className="ml-3 font-bold text-emerald-700 underline"
      >
        退出登录
      </button>
    </div>
  );
}