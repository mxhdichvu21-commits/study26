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

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, role, is_active, full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (
      profileError ||
      !profile ||
      profile.role !== "student" ||
      profile.is_active === false
    ) {
      return NextResponse.json(
        { error: "Tài khoản học sinh không hợp lệ." },
        { status: 403 }
      );
    }

    const formData = await req.formData();

    const assignmentId = String(
      formData.get("assignmentId") || ""
    ).trim();

    const content = String(formData.get("content") || "").trim();

    const file = formData.get("file");

    if (!assignmentId) {
      return NextResponse.json(
        { error: "Thiếu assignmentId." },
        { status: 400 }
      );
    }

    const { data: assignment, error: assignmentError } = await admin
      .from("assignments")
      .select("id, class_id, title, due_at, points")
      .eq("id", assignmentId)
      .maybeSingle();

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: "Không tìm thấy bài tập." },
        { status: 404 }
      );
    }

    const { data: membership, error: membershipError } = await admin
      .from("class_members")
      .select("class_id, user_id, role")
      .eq("class_id", assignment.class_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      membershipError ||
      !membership ||
      membership.role !== "student"
    ) {
      return NextResponse.json(
        { error: "Bạn không thuộc lớp của bài tập này." },
        { status: 403 }
      );
    }

    const { data: student, error: studentError } = await admin
      .from("students")
      .select("id, student_code")
      .eq("id", user.id)
      .maybeSingle();

    if (studentError || !student) {
      return NextResponse.json(
        { error: "Không tìm thấy hồ sơ học sinh." },
        { status: 404 }
      );
    }

    const { data: existingSubmission, error: existingError } =
      await admin
        .from("submissions")
        .select(
          "id, assignment_id, student_id, status, submitted_at, attachment_path"
        )
        .eq("assignment_id", assignmentId)
        .eq("student_id", student.id)
        .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        { error: existingError.message },
        { status: 500 }
      );
    }

    let attachmentPath =
      existingSubmission?.attachment_path || null;

    if (file instanceof File && file.size > 0) {
      const maxSize = 10 * 1024 * 1024;

      if (file.size > maxSize) {
        return NextResponse.json(
          { error: "File quá lớn. Tối đa 10MB." },
          { status: 400 }
        );
      }

      const safeName = file.name
        .normalize("NFKD")
        .replace(/[^\w.\- ]/g, "")
        .replace(/\s+/g, "_")
        .slice(-120);

      const fileName =
        safeName || `submission-${Date.now()}`;

      const path = `student-submissions/${student.id}/${assignmentId}/${Date.now()}-${fileName}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await admin.storage
        .from("materials")
        .upload(path, buffer, {
          contentType:
            file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        return NextResponse.json(
          {
            error:
              "Không thể tải file lên: " +
              uploadError.message,
          },
          { status: 500 }
        );
      }

      attachmentPath = path;

      if (
        existingSubmission?.attachment_path &&
        existingSubmission.attachment_path !== attachmentPath
      ) {
        await admin.storage
          .from("materials")
          .remove([existingSubmission.attachment_path]);
      }
    }

    const submittedAt = new Date().toISOString();

    if (existingSubmission) {
      const { error: updateError } = await admin
        .from("submissions")
        .update({
          status: "submitted",
          submitted_at: submittedAt,
          attachment_path: attachmentPath,
        })
        .eq("id", existingSubmission.id);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }
    } else {
      const { error: insertError } = await admin
        .from("submissions")
        .insert({
          assignment_id: assignmentId,
          student_id: student.id,
          status: "submitted",
          submitted_at: submittedAt,
          attachment_path: attachmentPath,
        });

      if (insertError) {
        return NextResponse.json(
          { error: insertError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Nộp bài thành công.",
    });
  } catch (error) {
    console.error("SUBMIT ASSIGNMENT ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Có lỗi xảy ra khi nộp bài.",
      },
      { status: 500 }
    );
  }
}
