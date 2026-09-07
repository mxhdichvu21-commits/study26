import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const assignmentId = url.searchParams.get("assignmentId");

    if (!assignmentId) {
      return NextResponse.json(
        { error: "Thiếu assignmentId." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const admin = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Chưa đăng nhập." },
        { status: 401 }
      );
    }

    const { data: assignment, error: assignmentError } =
      await admin
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

    if (assignmentError) throw assignmentError;

    if (!assignment) {
      return NextResponse.json(
        { error: "Không tìm thấy bài tập." },
        { status: 404 }
      );
    }

    const classInfo = Array.isArray(assignment.classes)
      ? assignment.classes[0]
      : assignment.classes;

    if (classInfo?.teacher_id !== user.id) {
      return NextResponse.json(
        { error: "Không có quyền." },
        { status: 403 }
      );
    }

    const { data: submissions, error } = await admin
      .from("submissions")
      .select(`
        id,
        student_id,
        status,
        submitted_at,
        profiles:student_id (
          id,
          full_name,
          avatar_url
        ),
        grades (
          id,
          score,
          feedback,
          graded_at
        ),
        submission_attachments (
          id,
          storage_path,
          file_name,
          mime_type,
          file_size,
          created_at
        )
      `)
      .eq("assignment_id", assignmentId)
      .order("submitted_at", {
        ascending: false,
        nullsFirst: false,
      });

    if (error) {
      console.error("SUBMISSIONS QUERY ERROR:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });

      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        },
        { status: 500 }
      );
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
