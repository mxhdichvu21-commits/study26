import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request
) {
  try {
    const url = new URL(request.url);

    const roomId =
      url.searchParams.get(
        "roomId"
      );

    if (!roomId) {
      return NextResponse.json(
        {
          error:
            "Thiếu roomId.",
        },
        { status: 400 }
      );
    }

    const supabase =
      await createClient();

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Bạn chưa đăng nhập.",
        },
        { status: 401 }
      );
    }

    const { data: room } =
      await supabase
        .from("rooms")
        .select(
          "id, class_id"
        )
        .eq(
          "id",
          roomId
        )
        .maybeSingle();

    if (!room) {
      return NextResponse.json(
        {
          error:
            "Không tìm thấy phòng học.",
        },
        { status: 404 }
      );
    }

    const { data: membership } =
      await supabase
        .from("class_members")
        .select(
          "class_id"
        )
        .eq(
          "class_id",
          room.class_id
        )
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "role",
          "student"
        )
        .maybeSingle();

    if (!membership) {
      return NextResponse.json(
        {
          error:
            "Bạn không thuộc lớp học này.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      classId:
        room.class_id,
    });
  } catch (error) {
    console.error(
      "RESOLVE ATTENDANCE ROOM ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Không thể xác định lớp học.",
      },
      { status: 500 }
    );
  }
}
