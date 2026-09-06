import React, { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 selection:bg-lime-200">
      <Suspense fallback={<div className="w-full max-w-md h-96 bg-white rounded-3xl animate-pulse" />}>
        <LoginForm />
      </Suspense>
      <div className="text-center mt-6 text-xs text-slate-400 font-medium">
        Crystal Press ERP System • Secure Multi-Role Authentication
      </div>
    </div>
  );
}
