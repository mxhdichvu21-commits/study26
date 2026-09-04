import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { roomId } = await request.json();

    if (!roomId) {
      return NextResponse.json(
        { error: "Thiếu roomId." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Bạn chưa đăng nhập." },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, role, is_active")
      .eq("id", user.id)
      .single();

    if (!profile || !profile.is_active) {
      return NextResponse.json(
        { error: "Tài khoản không hợp lệ hoặc đã bị khóa." },
        { status: 403 }
      );
    }

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("id, class_id, teacher_id, name, code, status")
      .eq("id", roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        { error: "Không tìm thấy phòng học." },
        { status: 404 }
      );
    }

    let allowed = false;

    if (profile.role === "teacher") {
      allowed = room.teacher_id === user.id;
    } else if (profile.role === "student") {
      const { data: member } = await supabase
        .from("class_members")
        .select("class_id, user_id")
        .eq("class_id", room.class_id)
        .eq("user_id", user.id)
        .maybeSingle();

      allowed = !!member;
    } else if (profile.role === "admin") {
      allowed = true;
    }

    if (!allowed) {
      return NextResponse.json(
        { error: "Bạn không có quyền vào phòng này." },
        { status: 403 }
      );
    }

    const livekitUrl = process.env.LIVEKIT_URL;
    const livekitApiKey = process.env.LIVEKIT_API_KEY;
    const livekitApiSecret = process.env.LIVEKIT_API_SECRET;

    if (!livekitUrl || !livekitApiKey || !livekitApiSecret) {
      return NextResponse.json(
        { error: "Thiếu cấu hình LiveKit trên server." },
        { status: 500 }
      );
    }

    const livekitRoomName = `study26-${room.id}`;

    const token = new AccessToken(
      livekitApiKey,
      livekitApiSecret,
      {
        identity: user.id,
        name: profile.full_name || user.email || "Study26 User",
        ttl: "2h",
      }
    );

    token.addGrant({
      roomJoin: true,
      room: livekitRoomName,
      canPublish: true,
      canSubscribe: true,
    });

    const jwt = await token.toJwt();

    const { data: existingMember } = await supabase
      .from("room_members")
      .select("room_id, user_id")
      .eq("room_id", room.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existingMember) {
      await supabase.from("room_members").insert({
        room_id: room.id,
        user_id: user.id,
        joined_at: new Date().toISOString(),
      });
    }

    if (room.status !== "live") {
      await supabase
        .from("rooms")
        .update({
          status: "live",
          started_at: new Date().toISOString(),
        })
        .eq("id", room.id);
    }

    return NextResponse.json({
      token: jwt,
      serverUrl: livekitUrl,
      roomName: livekitRoomName,
      role: profile.role,
      roomId: room.id,
      roomTitle: room.name,
    });
  } catch (error) {
    console.error("LIVEKIT TOKEN ERROR:", error);

    return NextResponse.json(
      { error: "Không thể tạo phiên học LiveKit." },
      { status: 500 }
    );
  }
}
