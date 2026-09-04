import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const code =
      typeof body.code === "string" ? body.code.trim().toUpperCase() : "";

    if (!code) {
      return NextResponse.json(
        { error: "Vui lòng nhập mã phòng." },
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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, role, is_active")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !profile ||
      profile.role !== "student" ||
      !profile.is_active
    ) {
      return NextResponse.json(
        { error: "Tài khoản học sinh không hợp lệ." },
        { status: 403 }
      );
    }

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select(`
        id,
        class_id,
        teacher_id,
        name,
        code,
        status,
        classes (
          id,
          name,
          code
        )
      `)
      .ilike("code", code)
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        { error: "Không tìm thấy phòng với mã này." },
        { status: 404 }
      );
    }

    if (room.status !== "live") {
      return NextResponse.json(
        {
          error:
            room.status === "ended"
              ? "Phòng học này đã kết thúc."
              : "Phòng chưa được giáo viên bắt đầu.",
        },
        { status: 409 }
      );
    }

    const { data: member, error: memberError } = await supabase
      .from("class_members")
      .select("class_id, user_id")
      .eq("class_id", room.class_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (memberError || !member) {
      return NextResponse.json(
        { error: "Bạn chưa được thêm vào lớp học này." },
        { status: 403 }
      );
    }

    const livekitUrl = process.env.LIVEKIT_URL;
    const livekitApiKey = process.env.LIVEKIT_API_KEY;
    const livekitApiSecret = process.env.LIVEKIT_API_SECRET;

    if (!livekitUrl || !livekitApiKey || !livekitApiSecret) {
      return NextResponse.json(
        { error: "LiveKit chưa được cấu hình đầy đủ trên server." },
        { status: 500 }
      );
    }

    const livekitRoomName = `study26-${room.id}`;

    const token = new AccessToken(
      livekitApiKey,
      livekitApiSecret,
      {
        identity: user.id,
        name: profile.full_name || user.email || "Học sinh Study26",
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
      .select("room_id, user_id, left_at")
      .eq("room_id", room.id)
      .eq("user_id", user.id)
      .is("left_at", null)
      .maybeSingle();

    if (!existingMember) {
      await supabase.from("room_members").insert({
        room_id: room.id,
        user_id: user.id,
        joined_at: new Date().toISOString(),
        left_at: null,
      });
    }

    return NextResponse.json({
      token: jwt,
      serverUrl: livekitUrl,
      roomName: livekitRoomName,
      roomId: room.id,
      roomTitle: room.name,
      classId: room.class_id,
    });
  } catch (error) {
    console.error("JOIN BY CODE ERROR:", error);

    return NextResponse.json(
      { error: "Không thể vào phòng học." },
      { status: 500 }
    );
  }
}
