"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { runtimeConfig } from "../../constants";

export type TripSummary = {
  count: number;
  totalFuel: number;
  totalFreight: number;
  clients: string[];
};

export type TripRecord = {
  id: number;
  date: string;
  client: string;
  origin: string;
  dest: string;
  note: string;
  fuel: number;
};

export type TripsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; summary: TripSummary; trips: TripRecord[] }
  | { status: "failure"; message: string };

function monthStart(year: number, month: number): string {
  const m = String(month).padStart(2, "0");
  return `${year}-${m}-01`;
}

function monthEnd(year: number, month: number): string {
  const d = new Date(year, month, 0).getDate();
  const m = String(month).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export function useTrips(targetYear?: number, targetMonth?: number) {
  const supabase = useMemo(() => {
    if (!runtimeConfig.supabaseUrl || !runtimeConfig.publishableKey) return null;
    return createClient(runtimeConfig.supabaseUrl, runtimeConfig.publishableKey);
  }, []);

  const [state, setState] = useState<TripsState>({ status: "idle" });
  const loadedRef = useRef(false);
  const year = targetYear ?? new Date().getFullYear();
  const month = targetMonth ?? new Date().getMonth() + 1;

  const load = useCallback(async ({ signal }: { signal?: AbortSignal } = {}) => {
    if (!supabase) {
      setState({ status: "failure", message: "Runtime 設定不完整" });
      return;
    }
    if (loadedRef.current) return;
    if (signal?.aborted) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setState({ status: "failure", message: "請先登入" });
      return;
    }

    setState({ status: "loading" });

    try {
      const ms = monthStart(year, month);
      const me = monthEnd(year, month);

      const [tripResp, freightResp] = await Promise.all([
        supabase
          .from("trips")
          .select("id,date,client,origin,dest,note,fuel")
          .gte("date", ms)
          .lte("date", me)
          .order("date", { ascending: true })
          .order("id", { ascending: true }),
        supabase
          .from("freight")
          .select("amount")
          .gte("date", ms)
          .lte("date", me),
      ]);

      if (tripResp.error) throw tripResp.error;

      const trips: TripRecord[] = (tripResp.data ?? []).map((t: any) => ({
        id: t.id,
        date: t.date,
        client: t.client ?? "",
        origin: t.origin ?? "",
        dest: t.dest ?? "",
        note: t.note ?? "",
        fuel: Number(t.fuel ?? 0),
      }));

      const totalFuel = trips.reduce((s, t) => s + t.fuel, 0);
      const clients = [...new Set(trips.map((t) => t.client))];
      const totalFreight = freightResp.data
        ? freightResp.data.reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0)
        : 0;

      const summary: TripSummary = {
        count: trips.length,
        totalFuel,
        totalFreight,
        clients,
      };

      setState({ status: "ok", summary, trips });
      loadedRef.current = true;
    } catch (e: any) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setState({ status: "failure", message: e?.message ?? "未知錯誤" });
    }
  }, [supabase, year, month]);

  useEffect(() => {
    loadedRef.current = false;
    const controller = new AbortController();
    load({ signal: controller.signal });
    return () => controller.abort();
  }, [load]);

  const reload = useCallback(() => {
    loadedRef.current = false;
    load();
  }, [load]);

  return { state, reload, year, month };
}
