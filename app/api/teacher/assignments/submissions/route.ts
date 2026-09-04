import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const assignmentId =
      url.searchParams.get("assignmentId");

    if (!assignmentId) {
      return NextResponse.json(
        { error: "Thiếu assignmentId." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Chưa đăng nhập." },
        { status: 401 }
      );
    }

    const { data: assignment } = await supabase
      .from("assignments")
      .select(`
        id,
        class_id,
        title,
        points,
        due_at,
        classes (
          teacher_id
        )
      `)
      .eq("id", assignmentId)
      .single();

    if (!assignment) {
      return NextResponse.json(
        { error: "Không tìm thấy bài tập." },
        { status: 404 }
      );
    }

    const classInfo = Array.isArray(
      assignment.classes
    )
      ? assignment.classes[0]
      : assignment.classes;

    if (classInfo?.teacher_id !== user.id) {
      return NextResponse.json(
        { error: "Không có quyền." },
        { status: 403 }
      );
    }

    const { data: submissions, error } =
      await supabase
        .from("submissions")
        .select(`
          id,
          student_id,
          status,
          submitted_at,
          attachment_path,
          profiles:student_id (
            full_name,
            avatar_url
          ),
          grades (
            id,
            score,
            feedback,
            graded_at
          )
        `)
        .eq("assignment_id", assignmentId)
        .order("submitted_at", {
          ascending: false,
        });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      assignment,
      submissions: submissions ?? [],
    });
  } catch (error) {
    console.error(
      "GET ASSIGNMENT SUBMISSIONS ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể tải bài nộp.",
      },
      { status: 500 }
    );
  }
}
