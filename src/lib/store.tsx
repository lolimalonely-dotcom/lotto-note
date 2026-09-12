"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, isCloud } from "./supabase";
import type { DraftRow, Entry } from "./types";

const LS_KEY = "lotto-note.v1";
const ROUND_KEY = `${LS_KEY}.round`;
const NAME_KEY = `${LS_KEY}.name`;
const TABLE = "entries";
const SELECT = "id, round, name, code, type, amount, batch_id, created_at";

export function todayRound(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/* ------------------------------------------------------------------ */
/* localStorage เป็น external store                                     */
/* อ่านผ่าน useSyncExternalStore เพื่อเลี่ยง hydration mismatch          */
/* และไม่ต้อง setState ใน effect                                        */
/* ------------------------------------------------------------------ */

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  // เปิดหลายแท็บแล้วอีกแท็บแก้ ให้แท็บนี้ตามด้วย
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function emit() {
  for (const cb of listeners) cb();
}

/* --- งวดที่เลือกอยู่ --- */

function getRoundSnapshot(): string {
  return window.localStorage.getItem(ROUND_KEY) ?? todayRound();
}

function getRoundServerSnapshot(): string {
  return todayRound();
}

function writeRound(value: string) {
  window.localStorage.setItem(ROUND_KEY, value);
  emit();
}

/* --- ชื่อรายการที่กำลังคีย์อยู่ (ค้างไว้ข้ามหน้า/รีเฟรช) --- */

function getNameSnapshot(): string {
  return window.localStorage.getItem(NAME_KEY) ?? "";
}

function getNameServerSnapshot(): string {
  return "";
}

function writeName(value: string) {
  window.localStorage.setItem(NAME_KEY, value);
  emit();
}

/* --- บรรทัดทั้งหมด (โหมดออฟไลน์) --- */

const NO_ENTRIES: Entry[] = [];
let localCache: Entry[] | null = null;

function getLocalSnapshot(): Entry[] {
  if (localCache === null) {
    try {
      const raw = window.localStorage.getItem(LS_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      localCache = Array.isArray(parsed?.entries) ? (parsed.entries as Entry[]) : NO_ENTRIES;
    } catch {
      localCache = NO_ENTRIES;
    }
  }
  return localCache;
}

function getLocalServerSnapshot(): Entry[] {
  return NO_ENTRIES;
}

function writeLocal(next: Entry[]) {
  localCache = next;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify({ entries: next }));
  } catch {
    /* โควตาเต็ม — ข้อมูลยังอยู่ใน cache ระหว่างเซสชัน */
  }
  emit();
}

/* ------------------------------------------------------------------ */
/* แปลงแถวจากฐานข้อมูล                                                  */
/* ------------------------------------------------------------------ */

type DbRow = {
  id: string;
  round: string;
  name: string;
  code: string;
  type: Entry["type"];
  amount: number | string;
  batch_id: string | null;
  created_at: string;
};

function fromDb(r: DbRow): Entry {
  return {
    id: r.id,
    round: r.round,
    name: r.name,
    code: r.code,
    type: r.type,
    amount: Number(r.amount),
    batchId: r.batch_id ?? "",
    createdAt: r.created_at,
  };
}

/* ------------------------------------------------------------------ */
/* context                                                              */
/* ------------------------------------------------------------------ */

export interface LastBatch {
  id: string;
  count: number;
  label: string;
}

interface StoreValue {
  mode: "local" | "cloud";
  booting: boolean;
  loading: boolean;
  error: string | null;
  clearError(): void;

  session: Session | null;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;

  round: string;
  setRound(round: string): void;
  rounds: string[];

  /** ชื่อรายการที่กำลังคีย์ — เก็บในสโตร์ จะได้ไม่หายตอนสลับไปดูแดชบอร์ดแล้วกลับมา */
  name: string;
  setName(name: string): void;

  /** ทุกบรรทัดของงวดที่เลือกอยู่ เรียงใหม่สุดขึ้นก่อน */
  entries: Entry[];
  names: string[];

  add(name: string, rows: DraftRow[]): Promise<number>;
  removeOne(id: string): Promise<void>;
  removeBatch(batchId: string): Promise<void>;
  removeName(name: string): Promise<void>;
  lastBatch: LastBatch | null;
  reload(): Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore ต้องอยู่ภายใน <StoreProvider>");
  return ctx;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const mode: "local" | "cloud" = isCloud ? "cloud" : "local";

  // โหมดออฟไลน์ไม่ต้องรออะไร — มีแต่โหมดคลาวด์ที่ต้องเช็กเซสชันก่อน
  const [booting, setBooting] = useState(isCloud);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [cloudRows, setCloudRows] = useState<Entry[]>([]);
  const [cloudRounds, setCloudRounds] = useState<string[]>([]);
  const [lastBatch, setLastBatch] = useState<LastBatch | null>(null);

  const round = useSyncExternalStore(subscribe, getRoundSnapshot, getRoundServerSnapshot);
  const name = useSyncExternalStore(subscribe, getNameSnapshot, getNameServerSnapshot);
  const allLocal = useSyncExternalStore(subscribe, getLocalSnapshot, getLocalServerSnapshot);

  const clearError = useCallback(() => setError(null), []);
  const setRound = useCallback((r: string) => writeRound(r), []);
  const setName = useCallback((n: string) => writeName(n), []);

  /* ---------------- auth (คลาวด์เท่านั้น) ---------------- */

  useEffect(() => {
    if (mode === "local") return;
    const sb = getSupabase();
    void sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setBooting(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, [mode]);

  /* ---------------- ดึงข้อมูลจากคลาวด์ ---------------- */

  const reload = useCallback(async () => {
    if (mode === "local" || !session) return;
    // โชว์ "กำลังโหลด" เฉพาะตอนที่ช้าจริง กันข้อความกระพริบตอนเน็ตเร็ว
    const slow = window.setTimeout(() => setLoading(true), 150);
    try {
      const sb = getSupabase();
      const [rowsRes, roundsRes] = await Promise.all([
        sb.from(TABLE).select(SELECT).eq("round", round).order("created_at", { ascending: false }),
        sb.from(TABLE).select("round").limit(10000),
      ]);

      if (rowsRes.error) {
        setError(rowsRes.error.message);
        return;
      }
      setCloudRows(((rowsRes.data ?? []) as DbRow[]).map(fromDb));

      if (!roundsRes.error) {
        const seen = new Set<string>(
          ((roundsRes.data ?? []) as { round: string }[]).map((r) => r.round),
        );
        setCloudRounds([...seen].sort().reverse());
      }
    } finally {
      window.clearTimeout(slow);
      setLoading(false);
    }
  }, [mode, session, round]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /* ---------------- ค่าที่คำนวณต่อ ---------------- */

  const entries = useMemo(() => {
    if (mode === "cloud") return cloudRows;
    return allLocal
      .filter((e) => e.round === round)
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [mode, cloudRows, allLocal, round]);

  const rounds = useMemo(() => {
    const base =
      mode === "cloud"
        ? cloudRounds
        : [...new Set(allLocal.map((e) => e.round))].sort().reverse();
    return base.includes(round) ? base : [round, ...base];
  }, [mode, cloudRounds, allLocal, round]);

  const names = useMemo(
    () => [...new Set(entries.map((e) => e.name))].sort((a, b) => a.localeCompare(b, "th")),
    [entries],
  );

  /* ---------------- เพิ่ม / ลบ ---------------- */

  const add = useCallback(
    async (name: string, rows: DraftRow[]): Promise<number> => {
      if (rows.length === 0) return 0;
      const batchId = newId();
      const label = `${name} · ${rows.length} บรรทัด`;

      if (mode === "local") {
        const base = Date.now();
        const made: Entry[] = rows.map((r, i) => ({
          id: newId(),
          round,
          name,
          code: r.code,
          type: r.type,
          amount: r.amount,
          batchId,
          // ไล่ ms ทีละแถว เพื่อให้ลำดับภายในชุดเดียวกันคงที่
          createdAt: new Date(base + i).toISOString(),
        }));
        writeLocal([...getLocalSnapshot(), ...made]);
        setLastBatch({ id: batchId, count: made.length, label });
        return made.length;
      }

      const { data, error: err } = await getSupabase()
        .from(TABLE)
        .insert(
          rows.map((r) => ({
            round,
            name,
            code: r.code,
            type: r.type,
            amount: r.amount,
            batch_id: batchId,
          })),
        )
        .select(SELECT);

      if (err) {
        setError(err.message);
        return 0;
      }
      const made = ((data ?? []) as DbRow[]).map(fromDb);
      setCloudRows((prev) => [...made, ...prev]);
      setCloudRounds((prev) =>
        prev.includes(round) ? prev : [round, ...prev].sort().reverse(),
      );
      setLastBatch({ id: batchId, count: made.length, label });
      return made.length;
    },
    [mode, round],
  );

  const dropWhere = useCallback(
    async (doomed: (e: Entry) => boolean, remote: () => Promise<string | null>) => {
      if (mode === "local") {
        writeLocal(getLocalSnapshot().filter((e) => !doomed(e)));
        return true;
      }
      const message = await remote();
      if (message) {
        setError(message);
        return false;
      }
      setCloudRows((prev) => prev.filter((e) => !doomed(e)));
      return true;
    },
    [mode],
  );

  const removeOne = useCallback(
    async (id: string) => {
      const victim = entries.find((e) => e.id === id);
      const ok = await dropWhere(
        (e) => e.id === id,
        async () => (await getSupabase().from(TABLE).delete().eq("id", id)).error?.message ?? null,
      );
      if (ok && victim) setLastBatch((b) => (b?.id === victim.batchId ? null : b));
    },
    [dropWhere, entries],
  );

  const removeBatch = useCallback(
    async (batchId: string) => {
      const ok = await dropWhere(
        (e) => e.batchId === batchId,
        async () =>
          (await getSupabase().from(TABLE).delete().eq("batch_id", batchId)).error?.message ?? null,
      );
      if (ok) setLastBatch((b) => (b?.id === batchId ? null : b));
    },
    [dropWhere],
  );

  const removeName = useCallback(
    async (name: string) => {
      const ok = await dropWhere(
        (e) => e.name === name && e.round === round,
        async () =>
          (await getSupabase().from(TABLE).delete().eq("round", round).eq("name", name)).error
            ?.message ?? null,
      );
      if (ok) setLastBatch(null);
    },
    [dropWhere, round],
  );

  /* ---------------- auth actions ---------------- */

  const signIn = useCallback(async (email: string, password: string) => {
    const { error: err } = await getSupabase().auth.signInWithPassword({ email, password });
    if (err) throw new Error(err.message);
  }, []);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
    setCloudRows([]);
    setCloudRounds([]);
  }, []);

  const value: StoreValue = {
    mode,
    booting,
    loading,
    error,
    clearError,
    session,
    signIn,
    signOut,
    round,
    setRound,
    rounds,
    name,
    setName,
    entries,
    names,
    add,
    removeOne,
    removeBatch,
    removeName,
    lastBatch,
    reload,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
