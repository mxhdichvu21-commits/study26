import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
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

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (
      profileError ||
      !profile ||
      profile.role !== "teacher" ||
      profile.is_active === false
    ) {
      return NextResponse.json(
        { error: "Bạn không có quyền truy cập." },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const submissionId =
      url.searchParams.get("submissionId")?.trim() || "";

    if (!submissionId) {
      return NextResponse.json(
        { error: "Thiếu submissionId." },
        { status: 400 }
      );
    }

    const { data: submission, error: submissionError } = await admin
      .from("submissions")
      .select(
        "id, assignment_id, student_id, attachment_path"
      )
      .eq("id", submissionId)
      .maybeSingle();

    if (submissionError || !submission) {
      return NextResponse.json(
        { error: "Không tìm thấy bài nộp." },
        { status: 404 }
      );
    }

    if (!submission.attachment_path) {
      return NextResponse.json(
        { error: "Bài nộp này không có file." },
        { status: 404 }
      );
    }

    const { data: assignment, error: assignmentError } =
      await admin
        .from("assignments")
        .select("id, class_id")
        .eq("id", submission.assignment_id)
        .maybeSingle();

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: "Không tìm thấy bài tập." },
        { status: 404 }
      );
    }

    const { data: teacherClass, error: teacherClassError } =
      await admin
        .from("classes")
        .select("id, teacher_id")
        .eq("id", assignment.class_id)
        .eq("teacher_id", user.id)
        .maybeSingle();

    if (teacherClassError || !teacherClass) {
      return NextResponse.json(
        { error: "Bạn không quản lý bài tập này." },
        { status: 403 }
      );
    }

    const { data: signed, error: signedError } = await admin.storage
      .from("materials")
      .createSignedUrl(
        submission.attachment_path,
        60 * 10
      );

    if (signedError || !signed?.signedUrl) {
      return NextResponse.json(
        {
          error:
            signedError?.message ||
            "Không thể tạo link file.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: signed.signedUrl,
    });
  } catch (error) {
    console.error("TEACHER SUBMISSION FILE ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Có lỗi xảy ra.",
      },
      { status: 500 }
    );
  }
}
