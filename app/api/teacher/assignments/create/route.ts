import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const classId =
      typeof body?.classId === "string"
        ? body.classId.trim()
        : "";

    const title =
      typeof body?.title === "string"
        ? body.title.trim()
        : "";

    const description =
      typeof body?.description === "string"
        ? body.description.trim()
        : "";

    const points =
      typeof body?.points === "number"
        ? body.points
        : 10;

    const dueAt =
      typeof body?.dueAt === "string" &&
      body.dueAt
        ? body.dueAt
        : null;

    const recipientIds = Array.isArray(
      body?.recipientIds
    )
      ? [
          ...new Set(
            body.recipientIds.filter(
              (x: unknown): x is string =>
                typeof x === "string" &&
                x.trim().length > 0
            )
          ),
        ]
      : [];

    if (!classId || !title) {
      return NextResponse.json(
        { error: "Thiếu tên bài tập hoặc lớp học." },
        { status: 400 }
      );
    }

    if (!recipientIds.length) {
      return NextResponse.json(
        { error: "Hãy chọn học sinh nhận bài." },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(points) ||
      points < 0
    ) {
      return NextResponse.json(
        { error: "Điểm tối đa không hợp lệ." },
        { status: 400 }
      );
    }

    const parsedDueAt = dueAt
      ? new Date(dueAt)
      : null;

    if (
      parsedDueAt &&
      Number.isNaN(
        parsedDueAt.getTime()
      )
    ) {
      return NextResponse.json(
        { error: "Hạn nộp không hợp lệ." },
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
        { error: "Bạn chưa đăng nhập." },
        { status: 401 }
      );
    }

    const { data: profile } =
      await admin
        .from("profiles")
        .select(
          "id, role, is_active"
        )
        .eq("id", user.id)
        .maybeSingle();

    if (
      !profile ||
      profile.role !== "teacher" ||
      profile.is_active === false
    ) {
      return NextResponse.json(
        { error: "Bạn không có quyền tạo bài tập." },
        { status: 403 }
      );
    }

    const { data: classRow } =
      await admin
        .from("classes")
        .select("id, teacher_id")
        .eq("id", classId)
        .maybeSingle();

    if (
      !classRow ||
      classRow.teacher_id !== user.id
    ) {
      return NextResponse.json(
        { error: "Bạn không quản lý lớp này." },
        { status: 403 }
      );
    }

    const { data: members, error: membersError } =
      await admin
        .from("class_members")
        .select("user_id")
        .eq("class_id", classId)
        .eq("role", "student")
        .in("user_id", recipientIds);

    if (membersError) throw membersError;

    const validIds = [
      ...new Set(
        (members ?? []).map(
          (m) => m.user_id
        )
      ),
    ];

    if (
      validIds.length !== recipientIds.length
    ) {
      return NextResponse.json(
        {
          error:
            "Danh sách học sinh không hợp lệ hoặc có học sinh ngoài lớp.",
        },
        { status: 400 }
      );
    }

    const assignmentInsert = await admin
      .from("assignments")
      .insert({
        class_id: classId,
        title,
        description: description || null,
        points: Math.max(0, points),
        due_at: parsedDueAt
          ? parsedDueAt.toISOString()
          : null,
        status: "published",
        created_by: user.id,
      })
      .select(
        "id, title, description, points, due_at, status, created_at"
      )
      .single();

    if (assignmentInsert.error) {
      console.error("ASSIGNMENT INSERT ERROR:", {
        code: assignmentInsert.error.code,
        message: assignmentInsert.error.message,
        details: assignmentInsert.error.details,
        hint: assignmentInsert.error.hint,
      });

      return NextResponse.json(
        {
          stage: "assignments.insert",
          error: assignmentInsert.error.message,
          code: assignmentInsert.error.code,
          details: assignmentInsert.error.details,
          hint: assignmentInsert.error.hint,
        },
        { status: 500 }
      );
    }

    const assignment = assignmentInsert.data;

    const recipientInsert = await admin
      .from("assignment_recipients")
      .insert(
        validIds.map((studentId) => ({
          assignment_id: assignment.id,
          student_id: studentId,
        }))
      );

    if (recipientInsert.error) {
      console.error("RECIPIENT INSERT ERROR:", {
        code: recipientInsert.error.code,
        message: recipientInsert.error.message,
        details: recipientInsert.error.details,
        hint: recipientInsert.error.hint,
      });

      await admin
        .from("assignments")
        .delete()
        .eq("id", assignment.id);

      return NextResponse.json(
        {
          stage: "assignment_recipients.insert",
          error: recipientInsert.error.message,
          code: recipientInsert.error.code,
          details: recipientInsert.error.details,
          hint: recipientInsert.error.hint,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      assignment,
      recipientCount: validIds.length,
    });
  } catch (error) {
    console.error(
      "CREATE ASSIGNMENT ERROR:",
      error
    );

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
