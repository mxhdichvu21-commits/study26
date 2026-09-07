import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "materials";
const MAX_FILE_SIZE = 50 * 1024 * 1024;

function cleanName(name: string) {
  return (
    name
      .normalize("NFKD")
      .replace(/[^\w.\- ]/g, "")
      .replace(/\s+/g, "_")
      .slice(-150) || "file"
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const kind = String(body?.kind || "").trim();
    const entityId = String(body?.entityId || "").trim();
    const fileName = String(body?.fileName || "").trim();
    const fileSize = Number(body?.fileSize || 0);

    if (!kind || !entityId || !fileName) {
      return NextResponse.json(
        { error: "Thiếu thông tin file." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      return NextResponse.json(
        { error: "Dung lượng file không hợp lệ." },
        { status: 400 }
      );
    }

    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File vượt quá giới hạn 50MB." },
        { status: 400 }
      );
    }

    if (!["lesson", "assignment", "submission"].includes(kind)) {
      return NextResponse.json(
        { error: "Loại file không hợp lệ." },
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

    if (!profile || profile.is_active === false) {
      return NextResponse.json(
        { error: "Tài khoản không hợp lệ." },
        { status: 403 }
      );
    }

    const fileKey = `${Date.now()}-${crypto.randomUUID()}-${cleanName(fileName)}`;

    let path = "";

    if (kind === "lesson") {
      if (profile.role !== "teacher") {
        return NextResponse.json(
          { error: "Chỉ giáo viên mới được upload file bài học." },
          { status: 403 }
        );
      }

      const { data: lesson } = await admin
        .from("lessons")
        .select("id, class_id")
        .eq("id", entityId)
        .maybeSingle();

      if (!lesson) {
        return NextResponse.json(
          { error: "Không tìm thấy bài học." },
          { status: 404 }
        );
      }

      const { data: teacherClass } = await admin
        .from("classes")
        .select("id")
        .eq("id", lesson.class_id)
        .eq("teacher_id", user.id)
        .maybeSingle();

      if (!teacherClass) {
        return NextResponse.json(
          { error: "Bạn không quản lý lớp của bài học này." },
          { status: 403 }
        );
      }

      path = `lessons/${lesson.id}/${fileKey}`;
    }

    if (kind === "assignment") {
      if (profile.role !== "teacher") {
        return NextResponse.json(
          { error: "Chỉ giáo viên mới được upload file bài tập." },
          { status: 403 }
        );
      }

      const { data: assignment } = await admin
        .from("assignments")
        .select("id, class_id")
        .eq("id", entityId)
        .maybeSingle();

      if (!assignment) {
        return NextResponse.json(
          { error: "Không tìm thấy bài tập." },
          { status: 404 }
        );
      }

      const { data: teacherClass } = await admin
        .from("classes")
        .select("id")
        .eq("id", assignment.class_id)
        .eq("teacher_id", user.id)
        .maybeSingle();

      if (!teacherClass) {
        return NextResponse.json(
          { error: "Bạn không quản lý lớp của bài tập này." },
          { status: 403 }
        );
      }

      path = `assignments/${assignment.id}/${fileKey}`;
    }

    if (kind === "submission") {
      if (profile.role !== "student") {
        return NextResponse.json(
          { error: "Chỉ học sinh mới được upload bài làm." },
          { status: 403 }
        );
      }

      const { data: submission } = await admin
        .from("submissions")
        .select("id, assignment_id, student_id")
        .eq("id", entityId)
        .maybeSingle();

      if (!submission || submission.student_id !== user.id) {
        return NextResponse.json(
          { error: "Không có quyền upload file này." },
          { status: 403 }
        );
      }

      path = `submissions/${submission.assignment_id}/${submission.student_id}/${fileKey}`;
    }

    const { data, error } = await admin.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);

    if (error || !data) {
      throw error || new Error("Không tạo được signed upload URL.");
    }

    return NextResponse.json({
      bucket: BUCKET,
      path,
      token: data.token,
      maxFileSize: MAX_FILE_SIZE,
    });
  } catch (error) {
    console.error("CREATE UPLOAD URL ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể chuẩn bị upload.",
      },
      { status: 500 }
    );
  }
}
