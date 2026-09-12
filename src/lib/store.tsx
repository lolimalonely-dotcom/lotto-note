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
import {
  DEFAULT_RATES,
  EMPTY_RESULT,
  normalizeRates,
  normalizeResult,
  type DraftRow,
  type DrawResult,
  type Entry,
  type PayoutRates,
} from "./types";

const LS_KEY = "lotto-note.v1";
const ROUND_KEY = `${LS_KEY}.round`;
const ROUND_LIST_KEY = `${LS_KEY}.roundList`;
const NAME_KEY = `${LS_KEY}.name`;
const RESULTS_KEY = `${LS_KEY}.results`;
const RATES_KEY = `${LS_KEY}.rates`;
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

/* --- รอบที่ผู้ใช้สร้างเอง ---
   รอบที่มีรายการแล้วจะถูกดึงจากข้อมูลอยู่แล้ว ส่วนรอบที่เพิ่งสร้างและยังไม่มีรายการ
   เก็บไว้ตรงนี้ เพื่อให้เลือกจากดรอปดาวน์ได้ทันทีโดยไม่ต้องพิมพ์ใหม่ */

const NO_ROUNDS: string[] = [];
let roundListCache: string[] | null = null;

function getRoundListSnapshot(): string[] {
  if (roundListCache === null) {
    try {
      const raw = window.localStorage.getItem(ROUND_LIST_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      roundListCache = Array.isArray(parsed) ? (parsed as string[]) : NO_ROUNDS;
    } catch {
      roundListCache = NO_ROUNDS;
    }
  }
  return roundListCache;
}

function getRoundListServerSnapshot(): string[] {
  return NO_ROUNDS;
}

function writeRoundList(next: string[]) {
  roundListCache = next;
  try {
    window.localStorage.setItem(ROUND_LIST_KEY, JSON.stringify(next));
  } catch {
    /* โควตาเต็ม */
  }
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

/* --- ผลรางวัลของแต่ละรอบ และอัตราจ่าย (โหมดออฟไลน์) --- */

const NO_RESULTS: Record<string, DrawResult> = {};
let resultsCache: Record<string, DrawResult> | null = null;

function getResultsSnapshot(): Record<string, DrawResult> {
  if (resultsCache === null) {
    try {
      const raw = window.localStorage.getItem(RESULTS_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      resultsCache = parsed && typeof parsed === "object" ? parsed : NO_RESULTS;
    } catch {
      resultsCache = NO_RESULTS;
    }
  }
  return resultsCache ?? NO_RESULTS;
}

function getResultsServerSnapshot(): Record<string, DrawResult> {
  return NO_RESULTS;
}

function writeResults(next: Record<string, DrawResult>) {
  resultsCache = next;
  try {
    window.localStorage.setItem(RESULTS_KEY, JSON.stringify(next));
  } catch {
    /* โควตาเต็ม */
  }
  emit();
}

let ratesCache: PayoutRates | null = null;

function getRatesSnapshot(): PayoutRates {
  if (ratesCache === null) {
    try {
      const raw = window.localStorage.getItem(RATES_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      ratesCache = normalizeRates(parsed);
    } catch {
      ratesCache = DEFAULT_RATES;
    }
  }
  return ratesCache ?? DEFAULT_RATES;
}

function getRatesServerSnapshot(): PayoutRates {
  return DEFAULT_RATES;
}

function writeRates(next: PayoutRates) {
  ratesCache = next;
  try {
    window.localStorage.setItem(RATES_KEY, JSON.stringify(next));
  } catch {
    /* โควตาเต็ม */
  }
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
  /** รอบทั้งหมดที่เลือกได้ (รอบที่มีข้อมูล + รอบที่สร้างไว้เอง) ใหม่สุดขึ้นก่อน */
  rounds: string[];
  /** สร้างรอบใหม่แล้วสลับไปที่รอบนั้นเลย คืน false ถ้าชื่อซ้ำหรือว่าง */
  createRound(name: string): boolean;
  /** ลบรอบออกจากดรอปดาวน์ (ใช้ตอนตั้งชื่อผิด) — ทำได้เฉพาะรอบที่ยังไม่มีรายการ */
  forgetRound(name: string): void;

  /** ชื่อรายการที่กำลังคีย์ — เก็บในสโตร์ จะได้ไม่หายตอนสลับไปดูแดชบอร์ดแล้วกลับมา */
  name: string;
  setName(name: string): void;

  /** ทุกบรรทัดของงวดที่เลือกอยู่ เรียงใหม่สุดขึ้นก่อน */
  entries: Entry[];
  names: string[];

  /** ผลรางวัลของรอบที่เลือกอยู่ */
  result: DrawResult;
  setResult(next: DrawResult): Promise<void>;
  /** อัตราจ่าย ใช้ร่วมกันทุกรอบ */
  rates: PayoutRates;
  setRates(next: PayoutRates): Promise<void>;

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
  const savedRounds = useSyncExternalStore(
    subscribe,
    getRoundListSnapshot,
    getRoundListServerSnapshot,
  );
  const localResults = useSyncExternalStore(
    subscribe,
    getResultsSnapshot,
    getResultsServerSnapshot,
  );
  const localRates = useSyncExternalStore(subscribe, getRatesSnapshot, getRatesServerSnapshot);
  const [cloudResults, setCloudResults] = useState<Record<string, DrawResult>>({});
  const [cloudRates, setCloudRates] = useState<PayoutRates | null>(null);

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
      const [rowsRes, roundsRes, resultsRes, ratesRes] = await Promise.all([
        sb.from(TABLE).select(SELECT).eq("round", round).order("created_at", { ascending: false }),
        sb.from(TABLE).select("round").limit(10000),
        sb.from("round_results").select("round, top2, bottom2, top3, bottom3"),
        sb.from("payout_rates").select("rates").maybeSingle(),
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

      // ตารางสองอันนี้มาจาก migration 0002 — ถ้ายังไม่ได้รัน ก็ใช้ค่าที่เก็บในเครื่องแทน
      if (!resultsRes.error) {
        const map: Record<string, DrawResult> = {};
        for (const r of (resultsRes.data ?? []) as Array<DrawResult & { round: string }>) {
          map[r.round] = {
            top2: r.top2 ?? "",
            bottom2: r.bottom2 ?? "",
            top3: r.top3 ?? "",
            bottom3: r.bottom3 ?? "",
          };
        }
        setCloudResults(map);
      }
      if (!ratesRes.error && ratesRes.data) {
        const stored = (ratesRes.data as { rates: Partial<PayoutRates> | null }).rates;
        setCloudRates(normalizeRates(stored));
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
    const withData =
      mode === "cloud" ? cloudRounds : [...new Set(allLocal.map((e) => e.round))];
    const all = new Set<string>([...withData, ...savedRounds, round]);
    return [...all].filter(Boolean).sort().reverse();
  }, [mode, cloudRounds, allLocal, savedRounds, round]);

  const createRound = useCallback(
    (raw: string): boolean => {
      const next = raw.trim();
      if (next === "" || rounds.includes(next)) return false;
      writeRoundList([...getRoundListSnapshot(), next]);
      writeRound(next);
      return true;
    },
    [rounds],
  );

  const forgetRound = useCallback((target: string) => {
    writeRoundList(getRoundListSnapshot().filter((r) => r !== target));
  }, []);

  /* ---------------- ผลรางวัล / อัตราจ่าย ---------------- */

  // normalize เผื่อข้อมูลที่เก็บไว้ก่อนหน้านี้ยังเป็นโครงเก่าที่ไม่มีช่อง 2 ตัวบน
  const storedResult = mode === "cloud" ? cloudResults[round] : localResults[round];
  const result: DrawResult = storedResult ? normalizeResult(storedResult) : EMPTY_RESULT;

  const rates: PayoutRates = mode === "cloud" ? (cloudRates ?? localRates) : localRates;

  const setResult = useCallback(
    async (next: DrawResult) => {
      // เก็บลงเครื่องเสมอ เพื่อให้ใช้ต่อได้แม้ตารางบนคลาวด์ยังไม่พร้อม
      writeResults({ ...getResultsSnapshot(), [round]: next });
      if (mode === "local") return;
      setCloudResults((prev) => ({ ...prev, [round]: next }));
      const { error: err } = await getSupabase()
        .from("round_results")
        .upsert({ round, ...next, updated_at: new Date().toISOString() }, { onConflict: "user_id,round" });
      if (err) setError(`บันทึกผลรางวัลขึ้นคลาวด์ไม่สำเร็จ (${err.message}) — ยังเก็บไว้ในเครื่องนี้ให้แล้ว`);
    },
    [mode, round],
  );

  const setRates = useCallback(
    async (next: PayoutRates) => {
      writeRates(next);
      if (mode === "local") return;
      setCloudRates(next);
      const { error: err } = await getSupabase()
        .from("payout_rates")
        .upsert({ rates: next, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (err) setError(`บันทึกอัตราจ่ายขึ้นคลาวด์ไม่สำเร็จ (${err.message}) — ยังเก็บไว้ในเครื่องนี้ให้แล้ว`);
    },
    [mode],
  );

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
        // ฐานข้อมูลยังเป็นสคีมาเก่า ที่ยังไม่รู้จักประเภท 3 ตัวล่าง
        setError(
          /entries_type_matches_code|entries_code_format/.test(err.message)
            ? "ฐานข้อมูลยังไม่รองรับประเภทนี้ — ต้องรันไฟล์ supabase/migrations/0002_check_results.sql ใน Supabase ก่อน (SQL Editor)"
            : err.message,
        );
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
    createRound,
    forgetRound,
    name,
    setName,
    result,
    setResult,
    rates,
    setRates,
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
