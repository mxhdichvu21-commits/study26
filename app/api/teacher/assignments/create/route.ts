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

    const points =
      typeof body.points === "number"
        ? body.points
        : 10;

    const dueAt =
      typeof body.dueAt === "string" &&
      body.dueAt
        ? body.dueAt
        : null;

    if (!classId || !title) {
      return NextResponse.json(
        { error: "Thiếu tên bài tập hoặc lớp học." },
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
        { error: "Bạn không có quyền tạo bài tập." },
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
      .from("assignments")
      .insert({
        class_id: classId,
        title,
        description: description || null,
        points: Math.max(0, points),
        due_at: dueAt
          ? new Date(dueAt).toISOString()
          : null,
        status: "draft",
        created_by: user.id,
      })
      .select(
        "id, title, description, points, due_at, status, created_at"
      )
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      assignment: data,
    });
  } catch (error) {
    console.error("CREATE ASSIGNMENT ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể tạo bài tập.",
      },
      { status: 500 }
    );
  }
}
