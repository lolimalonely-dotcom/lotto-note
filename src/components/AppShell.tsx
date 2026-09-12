"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { configError } from "@/lib/supabase";
import { btn, btnGhost, btnPrimary, card, input } from "./ui";

function NavTab({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        active ? "bg-accent text-accent-fg" : "text-muted hover:bg-surface-2 hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}

function LoginCard() {
  const { signIn } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 items-center px-4 py-16">
      <form
        className={`${card} w-full space-y-3 p-6`}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr(null);
          try {
            await signIn(email.trim(), password);
          } catch (error) {
            setErr(error instanceof Error ? error.message : "เข้าสู่ระบบไม่สำเร็จ");
          } finally {
            setBusy(false);
          }
        }}
      >
        <div>
          <h1 className="text-lg font-bold">เข้าสู่ระบบ</h1>
          <p className="mt-0.5 text-xs text-muted">
            บัญชีถูกสร้างไว้แล้วใน Supabase — ถ้าเข้าไม่ได้ให้เพิ่ม user ในหน้า Authentication
          </p>
        </div>
        <input
          className={input}
          type="email"
          autoComplete="username"
          placeholder="อีเมล"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className={input}
          type="password"
          autoComplete="current-password"
          placeholder="รหัสผ่าน"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {err ? (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
            {err}
          </p>
        ) : null}
        <button className={`${btnPrimary} w-full`} disabled={busy}>
          {busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
        </button>
      </form>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { mode, booting, session, signOut, round, setRound, rounds, error, clearError, loading } =
    useStore();

  const locked = mode === "cloud" && !session;

  return (
    <>
      <header className="no-print sticky top-0 z-30 border-b border-line bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
          <span className="text-base font-extrabold tracking-tight">
            คีย์เลข
            {mode === "local" ? (
              <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 align-middle text-[10px] font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                ออฟไลน์
              </span>
            ) : null}
          </span>

          {!locked && (
            <>
              <nav className="flex items-center gap-1">
                <NavTab href="/" label="คีย์รายการ" />
                <NavTab href="/dashboard" label="แดชบอร์ด" />
              </nav>

              <div className="ml-auto flex items-center gap-2">
                <label className="text-xs text-muted" htmlFor="round">
                  งวด
                </label>
                <input
                  id="round"
                  list="round-options"
                  className="keypad-input w-36 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25"
                  value={round}
                  onChange={(e) => setRound(e.target.value)}
                />
                <datalist id="round-options">
                  {rounds.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
                {loading ? <span className="text-xs text-muted">กำลังโหลด…</span> : null}
                {mode === "cloud" ? (
                  <button className={btnGhost} onClick={() => void signOut()} title={session?.user.email}>
                    ออก
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>
      </header>

      {configError ? (
        <div className="no-print mx-auto mt-3 w-full max-w-6xl px-4">
          <div className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
            <b>ตั้งค่า Supabase ไม่ถูกต้อง — ตอนนี้กำลังใช้โหมดออฟไลน์</b>
            <p className="mt-1">{configError}</p>
            <p className="mt-1 text-xs opacity-80">
              แก้ที่ Vercel → Settings → Environment Variables แล้ว Redeploy หนึ่งครั้ง
            </p>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="no-print mx-auto mt-3 w-full max-w-6xl px-4">
          <div className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            <span className="flex-1">{error}</span>
            <button className={btn} onClick={clearError}>
              ปิด
            </button>
          </div>
        </div>
      ) : null}

      {booting ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted">กำลังเปิด…</div>
      ) : locked ? (
        <LoginCard />
      ) : (
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-4">{children}</main>
      )}
    </>
  );
}
