import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const classIdParam =
      url.searchParams.get("classId");

    const roomId =
      url.searchParams.get("roomId");

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
            "Chưa đăng nhập.",
        },
        { status: 401 }
      );
    }

    let classId =
      classIdParam;

    /*
     * Tương thích với luồng cũ:
     * nếu component LiveKit truyền roomId,
     * tìm class_id từ room.
     *
     * Tuyệt đối không yêu cầu room phải live.
     */
    if (!classId && roomId) {
      const { data: room } =
        await supabase
          .from("rooms")
          .select(
            "id, class_id"
          )
          .eq("id", roomId)
          .maybeSingle();

      if (room) {
        classId =
          room.class_id;
      }
    }

    if (!classId) {
      return NextResponse.json(
        {
          error:
            "Thiếu classId.",
        },
        { status: 400 }
      );
    }

    /*
     * Học sinh phải thực sự thuộc lớp.
     */
    const {
      data: membership,
    } =
      await supabase
        .from("class_members")
        .select(
          "class_id, user_id, role"
        )
        .eq(
          "class_id",
          classId
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

    /*
     * Ngày hiện tại theo múi giờ Việt Nam.
     */
    const vietnamToday =
      new Intl.DateTimeFormat(
        "en-CA",
        {
          timeZone:
            "Asia/Ho_Chi_Minh",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }
      ).format(new Date());

    const {
      data: attendance,
      error,
    } = await supabase
      .from("attendance")
      .select(
        "id, student_id, class_id, status, joined_at"
      )
      .eq(
        "student_id",
        user.id
      )
      .eq(
        "class_id",
        classId
      )
      .eq(
        "attendance_date",
        vietnamToday
      )
      .maybeSingle();

    if (error) {
      console.error(
        "ATTENDANCE STATUS DB ERROR:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Không thể kiểm tra điểm danh.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      checkedIn:
        !!attendance,
      attendance:
        attendance || null,
    });
  } catch (error) {
    console.error(
      "ATTENDANCE STATUS ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể kiểm tra điểm danh.",
      },
      { status: 500 }
    );
  }
}
