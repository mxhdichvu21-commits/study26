import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const roomCode = String(body?.code ?? "")
      .trim()
      .toUpperCase();

    if (!roomCode) {
      return NextResponse.json(
        { error: "Vui lòng nhập mã phòng" },
        { status: 400 }
      );
    }

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

    const { data: profile, error: profileError } =
      await supabase
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

    if (
      profile.role !== "student" ||
      !profile.is_active
    ) {
      return NextResponse.json(
        { error: "Tài khoản không có quyền học sinh" },
        { status: 403 }
      );
    }

    const admin = createAdminClient();

    const {
      data: rooms,
      error: roomError,
    } = await admin
      .from("rooms")
      .select(
        "id, class_id, teacher_id, name, code, status"
      )
      .eq("code", roomCode)
      .limit(2);

    if (roomError) {
      console.error(
        "JOIN ROOM LOOKUP ERROR:",
        roomError
      );

      return NextResponse.json(
        {
          error:
            "Không thể kiểm tra phòng học. Kiểm tra cấu hình bảng rooms trên Supabase.",
        },
        { status: 500 }
      );
    }

    if (!rooms || rooms.length === 0) {
      return NextResponse.json(
        { error: "Không tìm thấy phòng với mã này" },
        { status: 404 }
      );
    }

    if (rooms.length > 1) {
      console.error(
        "DUPLICATE ROOM CODE:",
        roomCode,
        rooms.map((room) => room.id)
      );

      return NextResponse.json(
        {
          error:
            "Mã phòng đang bị trùng trong hệ thống. Hãy tạo mã phòng mới.",
        },
        { status: 500 }
      );
    }

    const room = rooms[0];

    if (room.status !== "live") {
      return NextResponse.json(
        {
          error:
            "Phòng học chưa được mở. Hãy chờ giáo viên bắt đầu phòng.",
        },
        { status: 400 }
      );
    }

    const {
      data: member,
      error: memberError,
    } = await admin
      .from("class_members")
      .select("class_id, user_id")
      .eq("class_id", room.class_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (memberError) {
      console.error(
        "JOIN ROOM MEMBERSHIP ERROR:",
        memberError
      );

      return NextResponse.json(
        { error: "Không thể kiểm tra quyền vào lớp" },
        { status: 500 }
      );
    }

    if (!member) {
      return NextResponse.json(
        {
          error:
            "Bạn chưa thuộc lớp của phòng học này",
        },
        { status: 403 }
      );
    }

    const livekitUrl = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!livekitUrl || !apiKey || !apiSecret) {
      console.error(
        "Missing LiveKit environment variables"
      );

      return NextResponse.json(
        { error: "LiveKit chưa được cấu hình" },
        { status: 500 }
      );
    }

    const roomName = `study26-${room.id}`;

    const token = new AccessToken(
      apiKey,
      apiSecret,
      {
        identity: user.id,
        name: user.email ?? user.id,
        ttl: "2h",
      }
    );

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    const jwt = await token.toJwt();

    const {
      error: memberUpsertError,
    } = await admin
      .from("room_members")
      .upsert(
        {
          room_id: room.id,
          user_id: user.id,
          joined_at: new Date().toISOString(),
          left_at: null,
        },
        {
          onConflict: "room_id,user_id",
        }
      );

    if (memberUpsertError) {
      console.error(
        "ROOM MEMBER UPSERT ERROR:",
        memberUpsertError
      );
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
    console.error(
      "JOIN BY CODE ERROR:",
      error
    );

    return NextResponse.json(
      { error: "Có lỗi khi vào phòng học" },
      { status: 500 }
    );
  }
}
