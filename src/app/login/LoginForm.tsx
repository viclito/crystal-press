"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Layers, ArrowRight, Lock, User, Sparkles, ShieldCheck } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Please enter both username and password");
      return;
    }

    setLoading(true);
    setError("");

    const isCashier = username.trim().toLowerCase() === "cashier";
    const destUrl = isCashier && (callbackUrl === "/" || !callbackUrl) ? "/pos" : callbackUrl;

    const res = await signIn("credentials", {
      username: username.trim(),
      password,
      redirect: false,
      callbackUrl: destUrl,
    });

    if (res?.error) {
      setError("Invalid username or password");
      setLoading(false);
    } else {
      router.push(destUrl);
      router.refresh();
    }
  };

  const handleQuickLogin = async (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setLoading(true);
    setError("");

    const isCashier = user.toLowerCase() === "cashier";
    const destUrl = isCashier && (callbackUrl === "/" || !callbackUrl) ? "/pos" : callbackUrl;

    const res = await signIn("credentials", {
      username: user,
      password: pass,
      redirect: false,
      callbackUrl: destUrl,
    });

    if (res?.error) {
      setError("Quick login failed");
      setLoading(false);
    } else {
      router.push(destUrl);
      router.refresh();
    }
  };

  const handleGoogleLogin = () => {
    signIn("google", { callbackUrl });
  };

  return (
    <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-slate-100/90 shadow-[0_4px_30px_rgba(0,0,0,0.04)] animate-in fade-in zoom-in-95 duration-200">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-lime-300 to-lime-500 flex items-center justify-center shadow-lime mx-auto mb-3">
          <Layers className="w-6 h-6 text-slate-900" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Crystal Press</h2>
        <p className="text-xs text-slate-400 font-medium mt-0.5">Staff & Management Portal</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 rounded-2xl border border-rose-200/80 text-xs font-bold text-rose-700 text-center">
          {error}
        </div>
      )}

      {/* Google OAuth Button */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        className="w-full py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 flex items-center justify-center gap-2.5 transition-all shadow-sm active:scale-98 mb-4"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>Sign in with Google</span>
      </button>

      {/* Divider */}
      <div className="relative flex items-center justify-center my-4">
        <div className="border-t border-slate-100 w-full" />
        <span className="bg-white px-3 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
          Or Staff Credentials
        </span>
        <div className="border-t border-slate-100 w-full" />
      </div>

      {/* Credentials Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Username</label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin / cashier"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:bg-white"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:bg-white"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-2xl bg-slate-900 text-white font-extrabold text-xs hover:bg-slate-800 shadow-md flex items-center justify-center gap-2 transition-all active:scale-98 mt-2 disabled:opacity-50"
        >
          <span>{loading ? "Authenticating..." : "Sign In to Terminal"}</span>
          <ArrowRight className="w-4 h-4 text-lime-400" />
        </button>
      </form>

      {/* Quick Shift Switcher (1-Click Counter Buttons with Usernames) */}
      <div className="mt-6 pt-5 border-t border-slate-100">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            ⚡ Quick Shift Switcher
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            1-Click Staff Access
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Admin / Owner */}
          <button
            type="button"
            onClick={() => handleQuickLogin("admin", "admin123")}
            className="p-2.5 bg-slate-50 hover:bg-lime-50 rounded-2xl border border-slate-200/80 hover:border-lime-400/60 text-left transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-900 group-hover:text-lime-900">
                  Admin / Owner
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>
              <p className="text-[9px] text-slate-400 mt-0.5">Full ERP Access</p>
            </div>

            <div className="mt-2 pt-1.5 border-t border-slate-200/60 font-mono text-[10px] text-slate-600 group-hover:text-slate-900">
              <div>user: <strong className="text-slate-900">admin</strong></div>
              <div>pass: <span className="text-slate-500">admin123</span></div>
            </div>
          </button>

          {/* Manager */}
          <button
            type="button"
            onClick={() => handleQuickLogin("manager", "manager123")}
            className="p-2.5 bg-slate-50 hover:bg-lime-50 rounded-2xl border border-slate-200/80 hover:border-lime-400/60 text-left transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-900 group-hover:text-lime-900">
                  Manager
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
              </div>
              <p className="text-[9px] text-slate-400 mt-0.5">Inventory & Jobs</p>
            </div>

            <div className="mt-2 pt-1.5 border-t border-slate-200/60 font-mono text-[10px] text-slate-600 group-hover:text-slate-900">
              <div>user: <strong className="text-slate-900">manager</strong></div>
              <div>pass: <span className="text-slate-500">manager123</span></div>
            </div>
          </button>

          {/* Cashier */}
          <button
            type="button"
            onClick={() => handleQuickLogin("cashier", "cashier123")}
            className="p-2.5 bg-slate-50 hover:bg-lime-50 rounded-2xl border border-slate-200/80 hover:border-lime-400/60 text-left transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-900 group-hover:text-lime-900">
                  Cashier
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              </div>
              <p className="text-[9px] text-slate-400 mt-0.5">Counter POS</p>
            </div>

            <div className="mt-2 pt-1.5 border-t border-slate-200/60 font-mono text-[10px] text-slate-600 group-hover:text-slate-900">
              <div>user: <strong className="text-slate-900">cashier</strong></div>
              <div>pass: <span className="text-slate-500">cashier123</span></div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
