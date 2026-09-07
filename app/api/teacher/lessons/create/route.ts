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
        { error: "Thiếu tên bài học hoặc lớp học." },
        { status: 400 }
      );
    }

    if (!recipientIds.length) {
      return NextResponse.json(
        { error: "Hãy chọn học sinh nhận bài." },
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
        { error: "Bạn không có quyền tạo bài học." },
        { status: 403 }
      );
    }

    const { data: classRow } = await admin
      .from("classes")
      .select("id, teacher_id")
      .eq("id", classId)
      .maybeSingle();

    if (!classRow || classRow.teacher_id !== user.id) {
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

    const { data: lesson, error } =
      await admin
        .from("lessons")
        .insert({
          class_id: classId,
          title,
          description: description || null,
          status: "published",
          created_by: user.id,
        })
        .select(
          "id, title, description, status, created_at"
        )
        .single();

    if (error) throw error;

    const { error: recipientError } =
      await admin
        .from("lesson_recipients")
        .insert(
          validIds.map((studentId) => ({
            lesson_id: lesson.id,
            student_id: studentId,
          }))
        );

    if (recipientError) {
      await admin
        .from("lessons")
        .delete()
        .eq("id", lesson.id);

      throw recipientError;
    }

    return NextResponse.json({
      success: true,
      lesson,
      recipientCount: validIds.length,
    });
  } catch (error) {
    console.error(
      "CREATE LESSON ERROR:",
      error
    );

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
