"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldCheck, Sparkles } from "lucide-react";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <main className="min-h-screen overflow-hidden bg-[#050816] px-4 py-8 text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.14),transparent_35%)]" />

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] shadow-2xl backdrop-blur lg:grid-cols-[1.1fr_0.9fr]">
          <div className="p-8 md:p-10">
            <p className="text-xs uppercase tracking-[0.35em] text-emerald-300">
              Jungle Gaming Challenge
            </p>

            <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">
              Crash Game
            </h1>

            <p className="mt-4 text-sm leading-6 text-slate-300 md:text-base">
              Entre com Keycloak para acessar sua carteira, apostar em tempo
              real, fazer cashout, acompanhar leaderboard e validar rodadas com
              Provably Fair.
            </p>

            {error ? (
              <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-100">
                {error}
              </div>
            ) : null}

            <a
              href="/api/auth/login"
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-6 py-4 font-bold text-slate-950 transition hover:bg-emerald-300"
            >
              <ShieldCheck size={20} />
              Entrar com Keycloak
            </a>
          </div>

          <div className="border-t border-white/10 bg-slate-950/70 p-8 md:p-10 lg:border-l lg:border-t-0">
            <div className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-5">
              <div className="flex items-center gap-3 text-emerald-100">
                <Sparkles size={22} />
                <h2 className="text-lg font-bold">Usuário demo</h2>
              </div>

              <div className="mt-5 space-y-3 text-sm">
                <div className="rounded-2xl bg-black/20 p-3">
                  <p className="text-slate-400">Username</p>
                  <p className="font-mono text-emerald-200">player</p>
                </div>

                <div className="rounded-2xl bg-black/20 p-3">
                  <p className="text-slate-400">Password</p>
                  <p className="font-mono text-emerald-200">player123</p>
                </div>
              </div>

              <p className="mt-5 text-xs leading-5 text-emerald-100/70">
                O login usa Authorization Code Flow com PKCE. Os tokens são
                armazenados em cookies httpOnly pelo servidor Next.js.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function LoginFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050816] px-4 text-slate-100">
      <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 text-sm text-slate-300">
        Carregando login...
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  );
}
