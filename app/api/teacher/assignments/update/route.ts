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

    const points =
      typeof body.points === "number"
        ? Math.max(0, body.points)
        : 0;

    const dueAt =
      typeof body.dueAt === "string" && body.dueAt
        ? body.dueAt
        : null;

    if (!id || !title) {
      return NextResponse.json(
        { error: "Thiếu thông tin bài tập." },
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
        { error: "Bạn không có quyền sửa bài tập." },
        { status: 403 }
      );
    }

    const { data: assignment } = await supabase
      .from("assignments")
      .select("id, class_id")
      .eq("id", id)
      .single();

    if (!assignment) {
      return NextResponse.json(
        { error: "Không tìm thấy bài tập." },
        { status: 404 }
      );
    }

    const { data: classData } = await supabase
      .from("classes")
      .select("id, teacher_id")
      .eq("id", assignment.class_id)
      .single();

    if (!classData || classData.teacher_id !== user.id) {
      return NextResponse.json(
        { error: "Bạn không quản lý lớp học này." },
        { status: 403 }
      );
    }

    let dueIso: string | null = null;

    if (dueAt) {
      const parsed = new Date(dueAt);

      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: "Hạn nộp không hợp lệ." },
          { status: 400 }
        );
      }

      dueIso = parsed.toISOString();
    }

    const { data, error } = await supabase
      .from("assignments")
      .update({
        title,
        description: description || null,
        points,
        due_at: dueIso,
      })
      .eq("id", id)
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
    console.error(
      "UPDATE ASSIGNMENT ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể sửa bài tập.",
      },
      { status: 500 }
    );
  }
}
