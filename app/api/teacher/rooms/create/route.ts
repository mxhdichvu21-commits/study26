import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 6;

function generateRoomCode() {
  let code = "";

  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_CHARS[randomInt(ROOM_CODE_CHARS.length)];
  }

  return code;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const classId = String(body?.classId ?? "").trim();
    const name = String(body?.name ?? "").trim();
    const scheduledAt = body?.scheduledAt
      ? String(body.scheduledAt)
      : "";

    if (!classId || !name) {
      return NextResponse.json(
        { error: "Thiếu classId hoặc tên phòng." },
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
        { error: "Bạn chưa đăng nhập." },
        { status: 401 }
      );
    }

    const { data: teacher, error: teacherError } = await supabase
      .from("profiles")
      .select("id, role, is_active")
      .eq("id", user.id)
      .single();

    if (
      teacherError ||
      !teacher ||
      teacher.role !== "teacher" ||
      !teacher.is_active
    ) {
      return NextResponse.json(
        { error: "Bạn không có quyền tạo phòng học." },
        { status: 403 }
      );
    }

    const { data: classData, error: classError } = await supabase
      .from("classes")
      .select("id, teacher_id")
      .eq("id", classId)
      .single();

    if (
      classError ||
      !classData ||
      classData.teacher_id !== user.id
    ) {
      return NextResponse.json(
        { error: "Bạn không quản lý lớp học này." },
        { status: 403 }
      );
    }

    const admin = createAdminClient();

    let roomCode = "";

    for (let attempt = 0; attempt < 20; attempt++) {
      const candidate = generateRoomCode();

      const { data: existingRoom, error: lookupError } = await admin
        .from("rooms")
        .select("id")
        .eq("code", candidate)
        .limit(1)
        .maybeSingle();

      if (lookupError) {
        console.error(
          "CREATE ROOM CODE LOOKUP ERROR:",
          lookupError
        );

        return NextResponse.json(
          { error: "Không thể kiểm tra mã phòng." },
          { status: 500 }
        );
      }

      if (!existingRoom) {
        roomCode = candidate;
        break;
      }
    }

    if (!roomCode) {
      return NextResponse.json(
        { error: "Không thể tạo mã phòng mới. Vui lòng thử lại." },
        { status: 500 }
      );
    }

    let normalizedScheduledAt: string | null = null;

    if (scheduledAt) {
      const parsedDate = new Date(scheduledAt);

      if (Number.isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { error: "Thời gian dự kiến không hợp lệ." },
          { status: 400 }
        );
      }

      normalizedScheduledAt = parsedDate.toISOString();
    }

    const { data: room, error: insertError } = await admin
      .from("rooms")
      .insert({
        class_id: classId,
        teacher_id: user.id,
        name,
        code: roomCode,
        status: "draft",
        scheduled_at: normalizedScheduledAt,
      })
      .select(
        "id, class_id, teacher_id, name, code, status, scheduled_at"
      )
      .single();

    if (insertError || !room) {
      console.error("CREATE ROOM INSERT ERROR:", insertError);

      if (insertError?.code === "23505") {
        return NextResponse.json(
          {
            error:
              "Mã phòng vừa bị trùng. Hãy bấm tạo lại.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          error:
            insertError?.message ||
            "Không thể tạo phòng học.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      room,
    });
  } catch (error) {
    console.error("CREATE ROOM ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể tạo phòng học.",
      },
      { status: 500 }
    );
  }
}
