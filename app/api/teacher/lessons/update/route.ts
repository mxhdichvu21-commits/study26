import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    const id = typeof body.id === "string" ? body.id : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : "";

    if (!id || !title) {
      return NextResponse.json(
        { error: "Thiếu thông tin bài học." },
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
        { error: "Bạn không có quyền sửa bài học." },
        { status: 403 }
      );
    }

    const { data: lesson } = await supabase
      .from("lessons")
      .select("id, class_id")
      .eq("id", id)
      .single();

    if (!lesson) {
      return NextResponse.json(
        { error: "Không tìm thấy bài học." },
        { status: 404 }
      );
    }

    const { data: classData } = await supabase
      .from("classes")
      .select("id, teacher_id")
      .eq("id", lesson.class_id)
      .single();

    if (!classData || classData.teacher_id !== user.id) {
      return NextResponse.json(
        { error: "Bạn không quản lý lớp học này." },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("lessons")
      .update({
        title,
        description: description || null,
      })
      .eq("id", id)
      .select(
        "id, title, description, status, created_at"
      )
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      lesson: data,
    });
  } catch (error) {
    console.error("UPDATE LESSON ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể sửa bài học.",
      },
      { status: 500 }
    );
  }
}
