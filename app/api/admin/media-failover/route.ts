import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase.from("profiles")
    .select("role, is_active").eq("id", user.id).single();
  return profile?.is_active === true && profile.role === "admin";
}

export async function GET() {
  if (!(await verifyAdmin())) return NextResponse.json({ error: "Cần quyền Admin" }, { status: 403 });
  const admin = createAdminClient();
  const [control, usage] = await Promise.all([
    admin.from("media_failover_control").select("mode, updated_at").eq("singleton", true).single(),
    admin.rpc("study26_livekit_minutes_used"),
  ]);
  if (control.error || usage.error) {
    return NextResponse.json({ error: "Thiếu bảng/RPC Media Failover. Hãy chạy migration." }, { status: 503 });
  }
  const month = new Date().toISOString().slice(0, 7);
  const baselineValid = process.env.STUDY26_LIVEKIT_BASELINE_MONTH === month;
  const baseline = baselineValid ? Number(process.env.STUDY26_LIVEKIT_BASELINE_MINUTES) : NaN;
  const measured = Number(usage.data ?? 0);
  const estimated = baselineValid && Number.isFinite(baseline) && Number.isFinite(measured)
    ? baseline + measured : null;
  return NextResponse.json({
    mode: control.data?.mode ?? "auto",
    usedFromWebhook: measured,
    estimatedUsedMinutes: estimated,
    monthlyLimit: 5000,
    switchAtMinutes: Number(process.env.STUDY26_LIVEKIT_SWITCH_AT_MINUTES ?? 4500),
    currentMonth: month,
    baselineValid: estimated != null,
    piikConfigured: Boolean(process.env.PIIK_PUBLIC_URL),
    piikSite: process.env.PIIK_PUBLIC_URL ?? null,
    updatedAt: control.data?.updated_at
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: "Cần quyền Admin" }, { status: 403 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Không chấp nhận Origin khác" }, { status: 403 });
  }
  const { mode } = await request.json().catch(() => ({}));
  if (mode !== "auto" && mode !== "livekit" && mode !== "piik") {
    return NextResponse.json({ error: "Chế độ phải là auto, livekit hoặc piik" }, { status: 400 });
  }
  const admin = createAdminClient();
  const { error } = await admin.from("media_failover_control").update({
    mode, updated_at: new Date().toISOString()
  }).eq("singleton", true);
  if (error) return NextResponse.json({ error: "Không thể cập nhật chế độ" }, { status: 503 });
  return NextResponse.json({ ok: true, mode }, { headers: { "Cache-Control": "no-store" } });
}
