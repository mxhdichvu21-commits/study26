import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

    // Xác thực người dùng bằng session hiện tại
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

    // Kiểm tra profile giáo viên
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, is_active")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !profile ||
      profile.role !== "teacher" ||
      !profile.is_active
    ) {
      return NextResponse.json(
        { error: "Bạn không có quyền xóa lịch học." },
        { status: 403 }
      );
    }

    // Lấy lịch hiện tại
    const { data: schedule, error: scheduleError } = await supabase
      .from("schedules")
      .select("id, class_id, teacher_id")
      .eq("id", id)
      .single();

    if (scheduleError || !schedule) {
      return NextResponse.json(
        { error: "Không tìm thấy lịch học." },
        { status: 404 }
      );
    }

    // Lịch phải thuộc giáo viên đang đăng nhập
    if (schedule.teacher_id !== user.id) {
      return NextResponse.json(
        { error: "Bạn không quản lý lịch học này." },
        { status: 403 }
      );
    }

    // Kiểm tra lớp cũng thuộc giáo viên này
    const { data: classData, error: classError } = await supabase
      .from("classes")
      .select("id, teacher_id")
      .eq("id", schedule.class_id)
      .single();

    if (
      classError ||
      !classData ||
      classData.teacher_id !== user.id
    ) {
      return NextResponse.json(
        { error: "Bạn không quản lý lớp này." },
        { status: 403 }
      );
    }

    // Dùng service role để tránh RLS chặn DELETE
    const admin = createAdminClient();

    const { error: deleteError } = await admin
      .from("schedules")
      .delete()
      .eq("id", id)
      .eq("teacher_id", user.id);

    if (deleteError) {
      console.error("DELETE SCHEDULE DB ERROR:", deleteError);

      return NextResponse.json(
        {
          error:
            deleteError.message ||
            "Không thể xóa lịch học.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Đã xóa lịch học.",
    });
  } catch (error) {
    console.error("DELETE SCHEDULE ERROR:", error);

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
