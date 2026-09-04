import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

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

    const { data: profile } = await admin
      .from("profiles")
      .select("id, role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (
      !profile ||
      profile.role !== "teacher" ||
      profile.is_active === false
    ) {
      return NextResponse.json(
        { error: "Bạn không có quyền chấm bài." },
        { status: 403 }
      );
    }

    const body = await req.json();

    const submissionId = String(
      body?.submissionId || ""
    ).trim();

    const scoreRaw = body?.score;

    const feedback =
      typeof body?.feedback === "string"
        ? body.feedback.trim()
        : "";

    if (!submissionId) {
      return NextResponse.json(
        { error: "Thiếu submissionId." },
        { status: 400 }
      );
    }

    if (
      scoreRaw === null ||
      scoreRaw === undefined ||
      scoreRaw === ""
    ) {
      return NextResponse.json(
        { error: "Vui lòng nhập điểm." },
        { status: 400 }
      );
    }

    const score = Number(scoreRaw);

    if (!Number.isFinite(score) || score < 0) {
      return NextResponse.json(
        { error: "Điểm không hợp lệ." },
        { status: 400 }
      );
    }

    const { data: submission, error: submissionError } = await admin
      .from("submissions")
      .select(
        "id, assignment_id, student_id, status"
      )
      .eq("id", submissionId)
      .maybeSingle();

    if (submissionError || !submission) {
      return NextResponse.json(
        { error: "Không tìm thấy bài nộp." },
        { status: 404 }
      );
    }

    const { data: assignment, error: assignmentError } =
      await admin
        .from("assignments")
        .select("id, class_id, points")
        .eq("id", submission.assignment_id)
        .maybeSingle();

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: "Không tìm thấy bài tập." },
        { status: 404 }
      );
    }

    const { data: teacherClass } = await admin
      .from("classes")
      .select("id, teacher_id")
      .eq("id", assignment.class_id)
      .eq("teacher_id", user.id)
      .maybeSingle();

    if (!teacherClass) {
      return NextResponse.json(
        { error: "Bạn không quản lý bài tập này." },
        { status: 403 }
      );
    }

    const maxPoints = Number(assignment.points ?? 0);

    if (maxPoints > 0 && score > maxPoints) {
      return NextResponse.json(
        {
          error: `Điểm không được vượt quá ${maxPoints}.`,
        },
        { status: 400 }
      );
    }

    const gradedAt = new Date().toISOString();

    const { data: existingGrade } = await admin
      .from("grades")
      .select("id")
      .eq("submission_id", submissionId)
      .maybeSingle();

    if (existingGrade) {
      const { error: updateGradeError } = await admin
        .from("grades")
        .update({
          grader_id: user.id,
          score,
          feedback: feedback || null,
          graded_at: gradedAt,
        })
        .eq("id", existingGrade.id);

      if (updateGradeError) {
        return NextResponse.json(
          { error: updateGradeError.message },
          { status: 500 }
        );
      }
    } else {
      const { error: insertGradeError } = await admin
        .from("grades")
        .insert({
          submission_id: submissionId,
          grader_id: user.id,
          score,
          feedback: feedback || null,
          graded_at: gradedAt,
        });

      if (insertGradeError) {
        return NextResponse.json(
          { error: insertGradeError.message },
          { status: 500 }
        );
      }
    }

    const { error: submissionUpdateError } = await admin
      .from("submissions")
      .update({
        status: "graded",
      })
      .eq("id", submissionId);

    if (submissionUpdateError) {
      return NextResponse.json(
        { error: submissionUpdateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Đã chấm bài.",
    });
  } catch (error) {
    console.error("GRADE SUBMISSION ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Có lỗi xảy ra khi chấm bài.",
      },
      { status: 500 }
    );
  }
}
