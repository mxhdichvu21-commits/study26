import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const classId =
      typeof body.classId === "string"
        ? body.classId
        : "";

    const title =
      typeof body.title === "string"
        ? body.title.trim()
        : "";

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : "";

    if (!classId || !title) {
      return NextResponse.json(
        { error: "Thiếu tên bài học hoặc lớp học." },
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

    const { data: teacherProfile } = await supabase
      .from("profiles")
      .select("id, role, is_active")
      .eq("id", user.id)
      .single();

    if (
      !teacherProfile ||
      teacherProfile.role !== "teacher" ||
      !teacherProfile.is_active
    ) {
      return NextResponse.json(
        { error: "Bạn không có quyền tạo bài học." },
        { status: 403 }
      );
    }

    const { data: classData } = await supabase
      .from("classes")
      .select("id, teacher_id")
      .eq("id", classId)
      .single();

    if (!classData || classData.teacher_id !== user.id) {
      return NextResponse.json(
        { error: "Bạn không quản lý lớp học này." },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("lessons")
      .insert({
        class_id: classId,
        title,
        description: description || null,
        status: "draft",
        created_by: user.id,
      })
      .select("id, title, description, status, created_at")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      lesson: data,
    });
  } catch (error) {
    console.error("CREATE LESSON ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể tạo bài học.",
      },
      { status: 500 }
    );
  }
}
