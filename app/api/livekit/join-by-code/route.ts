import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const roomCode = String(body?.code ?? "").trim().toUpperCase();

    if (!roomCode) {
      return NextResponse.json(
        { error: "Vui lòng nhập mã phòng" },
        { status: 400 }
      );
    }

    // Client thường: lấy session/user hiện tại.
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Bạn chưa đăng nhập" },
        { status: 401 }
      );
    }

    // Kiểm tra tài khoản hiện tại.
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, is_active")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Không tìm thấy tài khoản" },
        { status: 403 }
      );
    }

    if (profile.role !== "student" || !profile.is_active) {
      return NextResponse.json(
        { error: "Tài khoản không có quyền học sinh" },
        { status: 403 }
      );
    }

    /*
     * Dùng admin client CHỈ ở phía server để đọc phòng.
     * Không tắt RLS và không mở public access.
     *
     * Lý do:
     * Student client có thể bị RLS chặn đọc bảng rooms,
     * khiến phòng tồn tại nhưng query trả null -> 404 giả.
     */
    const admin = createAdminClient();

    const { data: room, error: roomError } = await admin
      .from("rooms")
      .select("id, class_id, teacher_id, name, code, status")
      .eq("code", roomCode)
      .maybeSingle();

    if (roomError) {
      console.error("JOIN ROOM LOOKUP ERROR:", roomError);

      return NextResponse.json(
        { error: "Không thể kiểm tra phòng học" },
        { status: 500 }
      );
    }

    if (!room) {
      return NextResponse.json(
        { error: "Không tìm thấy phòng với mã này" },
        { status: 404 }
      );
    }

    /*
     * Phòng phải được giáo viên mở.
     * Việc mở phòng hiện tại đã có trong /api/livekit/token:
     * draft -> live khi giáo viên bắt đầu phòng.
     */
    if (room.status !== "live") {
      return NextResponse.json(
        { error: "Phòng học chưa được mở. Hãy chờ giáo viên bắt đầu phòng." },
        { status: 400 }
      );
    }

    // Kiểm tra học sinh có thuộc đúng lớp của phòng hay không.
    const { data: member, error: memberError } = await admin
      .from("class_members")
      .select("class_id, user_id")
      .eq("class_id", room.class_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (memberError) {
      console.error("JOIN ROOM MEMBERSHIP ERROR:", memberError);

      return NextResponse.json(
        { error: "Không thể kiểm tra quyền vào lớp" },
        { status: 500 }
      );
    }

    if (!member) {
      return NextResponse.json(
        { error: "Bạn chưa thuộc lớp của phòng học này" },
        { status: 403 }
      );
    }

    const livekitUrl = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!livekitUrl || !apiKey || !apiSecret) {
      console.error("Missing LiveKit environment variables");

      return NextResponse.json(
        { error: "LiveKit chưa được cấu hình" },
        { status: 500 }
      );
    }

    /*
     * Giữ nguyên quy ước LiveKit hiện tại của project.
     */
    const roomName = `study26-${room.id}`;

    const token = new AccessToken(apiKey, apiSecret, {
      identity: user.id,
      name: user.email ?? user.id,
      ttl: "2h",
    });

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    const jwt = await token.toJwt();

    // Ghi nhận thành viên đã vào phòng.
    const { error: memberUpsertError } = await admin
      .from("room_members")
      .upsert(
        {
          room_id: room.id,
          user_id: user.id,
          joined_at: new Date().toISOString(),
        },
        {
          onConflict: "room_id,user_id",
        }
      );

    if (memberUpsertError) {
      console.error("ROOM MEMBER UPSERT ERROR:", memberUpsertError);
    }

    return NextResponse.json({
      token: jwt,
      serverUrl: livekitUrl,
      roomName,
      roomId: room.id,
      roomTitle: room.name,
      classId: room.class_id,
    });
  } catch (error) {
    console.error("JOIN BY CODE ERROR:", error);

    return NextResponse.json(
      { error: "Có lỗi khi vào phòng học" },
      { status: 500 }
    );
  }
}
