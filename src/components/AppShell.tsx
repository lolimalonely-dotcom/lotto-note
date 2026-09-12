"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { configError } from "@/lib/supabase";
import { btn, btnPrimary, btnQuiet, card, input, label } from "./ui";

function NavTab({ href, text }: { href: string; text: string }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={`flex min-h-12 flex-1 items-center justify-center rounded-xl px-4 text-lg font-bold transition ${
        active
          ? "bg-accent text-accent-fg"
          : "text-muted hover:bg-surface-2 hover:text-foreground"
      }`}
    >
      {text}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* แถบรอบ — เป็นหัวข้อใหญ่สุดของหน้า                                     */
/* ------------------------------------------------------------------ */

function RoundBar() {
  const { round, setRound, rounds, createRound, entries } = useStore();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const submit = () => {
    if (createRound(draft)) {
      setDraft("");
      setAdding(false);
      setErr(null);
    } else {
      setErr(draft.trim() === "" ? "ยังไม่ได้ตั้งชื่อรอบ" : "มีรอบชื่อนี้อยู่แล้ว");
    }
  };

  return (
    <div className={`${card} p-4`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-base font-semibold text-muted">รอบ</span>
        <select
          className={`${input} h-14 max-w-full flex-1 text-2xl font-bold sm:max-w-md`}
          value={round}
          onChange={(e) => setRound(e.target.value)}
        >
          {rounds.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button className={btn} onClick={() => setAdding((v) => !v)}>
          {adding ? "ยกเลิก" : "+ รอบใหม่"}
        </button>
      </div>

      {adding ? (
        <div className="mt-3 rounded-xl border-2 border-accent/40 bg-accent/5 p-3">
          <label className={label} htmlFor="new-round">
            ตั้งชื่อรอบใหม่ (พิมพ์อะไรก็ได้ เช่น 16 ก.ย. 68)
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id="new-round"
              autoFocus
              className={`${input} min-w-0 flex-1`}
              placeholder="เช่น 16 ก.ย. 68"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setErr(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
                if (e.key === "Escape") setAdding(false);
              }}
            />
            <button className={btnPrimary} onClick={submit}>
              สร้างรอบนี้
            </button>
          </div>
          {err ? <p className="mt-2 text-base font-semibold text-red-600">{err}</p> : null}
        </div>
      ) : (
        <p className="mt-2 text-base text-muted">
          {entries.length === 0
            ? "รอบนี้ยังไม่มีรายการ"
            : `รอบนี้มี ${entries.length} บรรทัด`}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function LoginCard() {
  const { signIn } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-12">
      <form
        className={`${card} w-full space-y-4 p-6`}
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
        <h1 className="text-2xl font-extrabold">เข้าสู่ระบบ</h1>
        <div>
          <label className={label} htmlFor="email">
            อีเมล
          </label>
          <input
            id="email"
            className={input}
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={label} htmlFor="password">
            รหัสผ่าน
          </label>
          <input
            id="password"
            className={input}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {err ? (
          <p className="rounded-xl bg-red-500/10 px-4 py-3 text-base font-semibold text-red-600 dark:text-red-400">
            {err}
          </p>
        ) : null}
        <button className={`${btnPrimary} h-14 w-full text-lg`} disabled={busy}>
          {busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
        </button>
      </form>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { mode, booting, session, signOut, error, clearError } = useStore();
  const locked = mode === "cloud" && !session;

  return (
    <>
      <header className="no-print border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <span className="text-xl font-extrabold tracking-tight">คีย์เลข</span>
          {mode === "local" ? (
            <span className="rounded-lg bg-amber-100 px-2 py-1 text-sm font-bold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
              ออฟไลน์
            </span>
          ) : null}
          {!locked && mode === "cloud" ? (
            <button className={`${btnQuiet} ml-auto`} onClick={() => void signOut()}>
              ออกจากระบบ
            </button>
          ) : null}
        </div>
      </header>

      {configError ? (
        <div className="no-print mx-auto mt-4 w-full max-w-5xl px-4">
          <div className="rounded-xl border-2 border-amber-400 bg-amber-50 px-4 py-3 text-base text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
            <b>ตั้งค่า Supabase ไม่ถูกต้อง — ตอนนี้ใช้โหมดออฟไลน์</b>
            <p className="mt-1">{configError}</p>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="no-print mx-auto mt-4 w-full max-w-5xl px-4">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-base text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            <span className="flex-1">{error}</span>
            <button className={btn} onClick={clearError}>
              ปิด
            </button>
          </div>
        </div>
      ) : null}

      {booting ? (
        <div className="flex flex-1 items-center justify-center text-lg text-muted">
          กำลังเปิด…
        </div>
      ) : locked ? (
        <LoginCard />
      ) : (
        <main className="mx-auto w-full max-w-5xl flex-1 space-y-4 px-4 py-4">
          <RoundBar />
          <nav className="no-print flex gap-2 rounded-2xl border border-line bg-surface p-1.5">
            <NavTab href="/" text="คีย์รายการ" />
            <NavTab href="/dashboard" text="สรุปยอด" />
          </nav>
          {children}
        </main>
      )}
    </>
  );
}
