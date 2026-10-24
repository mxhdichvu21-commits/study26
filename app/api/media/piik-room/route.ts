import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authorize(roomId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles")
    .select("role, is_active").eq("id", user.id).single();
  if (!profile?.is_active) return null;
  const { data: room } = await supabase.from("rooms")
    .select("id, class_id, teacher_id, status, media_provider")
    .eq("id", roomId).single();
  if (!room || room.status === "ended") return null;
  const teacher = profile.role === "teacher" && room.teacher_id === user.id;
  const administrator = profile.role === "admin";
  let student = false;
  if (profile.role === "student") {
    const { data: member } = await supabase.from("class_members")
      .select("user_id").eq("class_id", room.class_id).eq("user_id", user.id).maybeSingle();
    student = Boolean(member);
  }
  if (!teacher && !student && !administrator) return null;
  return { userId: user.id, room, teacher };
}

function validatePiikInvite(value: unknown) {
  const base = process.env.PIIK_PUBLIC_URL;
  if (!base) throw new Error("Chưa cấu hình PIIK_PUBLIC_URL.");
  const expected = new URL(base);
  if (expected.protocol !== "https:") throw new Error("Piik phải dùng HTTPS.");
  if (typeof value !== "string" || value.length > 2048) throw new Error("Liên kết không hợp lệ.");
  const url = new URL(value);
  if (url.origin !== expected.origin || !/^\/r\/[1-9][0-9]{3}\/?$/.test(url.pathname)
    || !/^#v=[A-Za-z0-9_-]{22}$/.test(url.hash)
    || url.username || url.password || url.search) {
    throw new Error("Chỉ chấp nhận đường mời người xem từ máy chủ Piik đã cấu hình.");
  }
  return url.href;
}

export async function GET(request: Request) {
  const roomId = new URL(request.url).searchParams.get("roomId");
  if (!roomId) return NextResponse.json({ error: "Thiếu roomId" }, { status: 400 });
  const access = await authorize(roomId);
  if (!access) return NextResponse.json({ error: "Không có quyền vào phòng" }, { status: 403 });
  const admin = createAdminClient();
  const { data, error } = await admin.from("media_piik_invites")
    .select("invite_url").eq("room_id", roomId).maybeSingle();
  if (error) return NextResponse.json({ error: "Chưa thể tải phòng Piik" }, { status: 503 });
  return NextResponse.json({
    provider: "piik",
    isTeacher: access.teacher,
    piikSite: process.env.PIIK_PUBLIC_URL ?? null,
    inviteUrl: data?.invite_url ?? null
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const { roomId, inviteUrl } = await request.json().catch(() => ({}));
  if (typeof roomId !== "string") return NextResponse.json({ error: "Thiếu roomId" }, { status: 400 });
  const access = await authorize(roomId);
  if (!access?.teacher) return NextResponse.json({ error: "Chỉ giáo viên tạo đường mời Piik" }, { status: 403 });
  if (access.room.media_provider !== "piik") {
    return NextResponse.json({ error: "Phòng này không sử dụng Piik" }, { status: 409 });
  }
  let url: string;
  try { url = validatePiikInvite(inviteUrl); }
  catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Đường dẫn không hợp lệ" }, { status: 400 });
  }
  const admin = createAdminClient();
  const { error } = await admin.from("media_piik_invites").upsert({
    room_id: roomId, invite_url: url, updated_by: access.userId, updated_at: new Date().toISOString()
  }, { onConflict: "room_id" });
  if (error) return NextResponse.json({ error: "Không thể lưu đường mời" }, { status: 503 });
  return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
}
