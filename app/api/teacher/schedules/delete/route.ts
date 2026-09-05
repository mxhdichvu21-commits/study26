import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(request: Request) {
  try {
    const body = await request.json();

    const id = typeof body.id === "string" ? body.id : "";

    if (!id) {
      return NextResponse.json(
        { error: "Thiếu ID lịch học." },
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

    const { data: schedule } = await supabase
      .from("schedules")
      .select("id, class_id, teacher_id")
      .eq("id", id)
      .single();

    if (!schedule) {
      return NextResponse.json(
        { error: "Không tìm thấy lịch học." },
        { status: 404 }
      );
    }

    const { data: classData } = await supabase
      .from("classes")
      .select("id, teacher_id")
      .eq("id", schedule.class_id)
      .single();

    if (
      !classData ||
      classData.teacher_id !== user.id ||
      schedule.teacher_id !== user.id
    ) {
      return NextResponse.json(
        {
          error:
            "Bạn không quản lý lịch học này.",
        },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from("schedules")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "DELETE SCHEDULE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể xóa lịch học.",
      },
      { status: 500 }
    );
  }
}
