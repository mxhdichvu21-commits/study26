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
      .select(
        "id, role, is_active, full_name"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (
      !profile ||
      profile.role !== "student" ||
      profile.is_active === false
    ) {
      return NextResponse.json(
        {
          error:
            "Tài khoản học sinh không hợp lệ.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();

    const assignmentId = String(
      body?.assignmentId || ""
    ).trim();

    const mode = String(
      body?.mode || "prepare"
    ).trim();

    if (!assignmentId) {
      return NextResponse.json(
        { error: "Thiếu assignmentId." },
        { status: 400 }
      );
    }

    const { data: assignment } =
      await admin
        .from("assignments")
        .select(
          "id, class_id, title, due_at, points"
        )
        .eq("id", assignmentId)
        .maybeSingle();

    if (!assignment) {
      return NextResponse.json(
        { error: "Không tìm thấy bài tập." },
        { status: 404 }
      );
    }

    const { data: recipient } =
      await admin
        .from("assignment_recipients")
        .select(
          "assignment_id, student_id"
        )
        .eq("assignment_id", assignmentId)
        .eq("student_id", user.id)
        .maybeSingle();

    if (!recipient) {
      return NextResponse.json(
        {
          error:
            "Bạn không được giao bài tập này.",
        },
        { status: 403 }
      );
    }

    const { data: existing } =
      await admin
        .from("submissions")
        .select(
          "id, status, submitted_at"
        )
        .eq("assignment_id", assignmentId)
        .eq("student_id", user.id)
        .maybeSingle();

    if (mode === "prepare") {
      if (existing) {
        return NextResponse.json({
          success: true,
          submissionId: existing.id,
          status: existing.status,
        });
      }

      const { data: created, error } =
        await admin
          .from("submissions")
          .insert({
            assignment_id: assignmentId,
            student_id: user.id,
            status: "draft",
          })
          .select(
            "id, status, submitted_at"
          )
          .single();

      if (error) {
        console.error("SUBMISSION PREPARE ERROR:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });

        return NextResponse.json(
          {
            stage: "submissions.insert",
            error: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        submissionId: created.id,
        status: created.status,
      });
    }

    if (mode === "finalize") {
      if (!existing) {
        return NextResponse.json(
          {
            error:
              "Không tìm thấy bản nháp bài nộp.",
          },
          { status: 404 }
        );
      }

      const { count } = await admin
        .from("submission_attachments")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq(
          "submission_id",
          existing.id
        );

      if (!count) {
        return NextResponse.json(
          {
            error:
              "Bạn chưa upload file bài làm.",
          },
          { status: 400 }
        );
      }

      const isLate =
        !!assignment.due_at &&
        new Date(
          assignment.due_at
        ).getTime() < Date.now();

      const status = isLate
        ? "late"
        : "submitted";

      const { data: updated, error } =
        await admin
          .from("submissions")
          .update({
            status,
            submitted_at:
              new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select(
            "id, status, submitted_at"
          )
          .single();

      if (error) {
        console.error("SUBMISSION FINALIZE ERROR:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });

        return NextResponse.json(
          {
            stage: "submissions.update",
            error: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        submissionId: updated.id,
        status: updated.status,
        submittedAt:
          updated.submitted_at,
      });
    }

    return NextResponse.json(
      { error: "Mode không hợp lệ." },
      { status: 400 }
    );
  } catch (error) {
    console.error(
      "STUDENT SUBMISSION ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể xử lý bài nộp.",
      },
      { status: 500 }
    );
  }
}
