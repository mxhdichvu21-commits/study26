import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const classId =
      typeof body.classId === "string"
        ? body.classId
        : "";

    const startsAt =
      typeof body.startsAt === "string"
        ? body.startsAt
        : "";

    const endsAt =
      typeof body.endsAt === "string"
        ? body.endsAt
        : "";

    const roomId =
      typeof body.roomId === "string" &&
      body.roomId
        ? body.roomId
        : null;

    if (!classId || !startsAt || !endsAt) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ thời gian." },
        { status: 400 }
      );
    }

    const start = new Date(startsAt);
    const end = new Date(endsAt);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      return NextResponse.json(
        { error: "Thời gian không hợp lệ." },
        { status: 400 }
      );
    }

    if (end <= start) {
      return NextResponse.json(
        { error: "Thời gian kết thúc phải sau thời gian bắt đầu." },
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
      .select("id, role, is_active")
      .eq("id", user.id)
      .single();

    if (
      !profile ||
      profile.role !== "teacher" ||
      !profile.is_active
    ) {
      return NextResponse.json(
        { error: "Bạn không có quyền tạo lịch học." },
        { status: 403 }
      );
    }

    const { data: classData } = await supabase
      .from("classes")
      .select("id, teacher_id, subject_id")
      .eq("id", classId)
      .single();

    if (!classData || classData.teacher_id !== user.id) {
      return NextResponse.json(
        { error: "Bạn không quản lý lớp này." },
        { status: 403 }
      );
    }

    if (roomId) {
      const { data: room } = await supabase
        .from("rooms")
        .select("id, class_id, teacher_id")
        .eq("id", roomId)
        .single();

      if (
        !room ||
        room.class_id !== classId ||
        room.teacher_id !== user.id
      ) {
        return NextResponse.json(
          { error: "Phòng học không thuộc lớp này." },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase
      .from("schedules")
      .insert({
        class_id: classId,
        room_id: roomId,
        teacher_id: user.id,
        subject_id: classData.subject_id,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
      })
      .select(
        "id, starts_at, ends_at, room_id, created_at"
      )
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      schedule: data,
    });
  } catch (error) {
    console.error("CREATE SCHEDULE ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể tạo lịch học.",
      },
      { status: 500 }
    );
  }
}
