"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Mode = "auto" | "livekit" | "piik";
type Status = {
  mode: Mode;
  usedFromWebhook: number;
  estimatedUsedMinutes: number | null;
  monthlyLimit: number;
  switchAtMinutes: number;
  currentMonth: string;
  baselineValid: boolean;
  piikConfigured: boolean;
  piikSite: string | null;
  updatedAt: string | null;
};

export default function AdminMediaFailover() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const response = await fetch("/api/admin/media-failover", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "Không tải được Media Failover");
    setStatus(body);
  }, []);
  useEffect(() => {
    void load().catch((cause) => setError(String(cause)));
  }, [load]);

  async function changeMode(mode: Mode) {
    if (!window.confirm(`Áp dụng chế độ ${mode.toUpperCase()} cho những phòng chưa chốt máy chủ?`)) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/media-failover", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Không đổi được chế độ");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Có lỗi xảy ra");
    } finally { setBusy(false); }
  }

  const numeric = status?.estimatedUsedMinutes;
  return <main className="min-h-screen bg-slate-50 p-5 md:p-10 text-slate-900">
    <div className="mx-auto max-w-4xl">
      <Link href="/admin" className="font-semibold text-indigo-700">← Quản trị Study26</Link>
      <h1 className="mt-5 text-3xl font-bold">Media Failover Control Center</h1>
      <p className="mt-2 text-slate-600">LiveKit Cloud là chế độ chính. Piik là phòng trình chiếu dự phòng (1 Host + tối đa 20 Viewer).</p>

      {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Chế độ hiện tại</p>
          <p className="mt-2 text-xl font-bold uppercase">{status?.mode ?? "..."}</p></div>
        <div className="rounded-xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Ước tính phút-người</p>
          <p className="mt-2 text-xl font-bold">{numeric == null ? "Chưa có" : numeric.toFixed(1)} / 5.000</p></div>
        <div className="rounded-xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Ngưỡng chuyển Piik</p>
          <p className="mt-2 text-xl font-bold">{status?.switchAtMinutes ?? "..."} phút</p></div>
      </div>

      <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Chọn cách hoạt động</h2>
        <p className="my-3 text-sm text-slate-600">
          Chế độ mới chỉ áp dụng cho phòng chưa chọn media provider. Không ngắt những buổi đang học.
        </p>
        <div className="flex flex-wrap gap-3">
          {(["auto", "livekit", "piik"] as const).map(mode =>
            <button key={mode} type="button" disabled={busy || status?.mode === mode}
              onClick={() => void changeMode(mode)}
              className="rounded-lg bg-indigo-700 px-5 py-3 font-semibold text-white disabled:opacity-40">
              {mode === "auto" ? "Tự động" : mode === "livekit" ? "Chỉ LiveKit" : "Chuyển sang Piik"}
            </button>
          )}
        </div>
        <p className="mt-5 text-sm text-slate-600">Piik: {status?.piikConfigured ? "Đã khai báo URL" : "Chưa cấu hình máy chủ"}.
          {status?.piikSite && <> <a href={status.piikSite} className="text-indigo-700" target="_blank" rel="noopener noreferrer">Mở Piik</a></>}</p>
        <p className="mt-2 text-sm text-slate-600">
          Webhook đã ghi nhận {status?.usedFromWebhook?.toFixed(1) ?? "..."} phút; số liệu này không phải quota trực tiếp từ LiveKit Cloud.
          {!status?.baselineValid && " Chế độ Auto cần cấu hình baseline đúng tháng trong Vercel."}
        </p>
        <button className="mt-4 rounded-lg border border-slate-300 px-4 py-2" onClick={() => void load().catch(e => setError(String(e)))}>
          Tải lại trạng thái
        </button>
      </div>
    </div>
  </main>;
}
