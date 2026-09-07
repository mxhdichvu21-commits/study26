import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const kind = String(body?.kind || "").trim();
    const entityId = String(body?.entityId || "").trim();
    const storagePath = String(body?.storagePath || "").trim();
    const fileName = String(body?.fileName || "").trim();
    const mimeType =
      typeof body?.mimeType === "string" ? body.mimeType : null;
    const fileSize = Number(body?.fileSize || 0);

    if (!kind || !entityId || !storagePath || !fileName) {
      return NextResponse.json(
        { error: "Thiếu metadata file." },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(fileSize) ||
      fileSize <= 0 ||
      fileSize > MAX_FILE_SIZE
    ) {
      return NextResponse.json(
        { error: "Dung lượng file không hợp lệ." },
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

    if (kind === "lesson") {
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
          { error: "Không có quyền." },
          { status: 403 }
        );
      }

      const { error } = await admin
        .from("lesson_attachments")
        .insert({
          lesson_id: entityId,
          storage_path: storagePath,
          file_name: fileName,
          mime_type: mimeType,
          file_size: fileSize,
        });

      if (error) throw error;
    }

    if (kind === "assignment") {
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
          { error: "Không có quyền." },
          { status: 403 }
        );
      }

      const { error } = await admin
        .from("assignment_attachments")
        .insert({
          assignment_id: entityId,
          storage_path: storagePath,
          file_name: fileName,
          mime_type: mimeType,
          file_size: fileSize,
        });

      if (error) throw error;
    }

    if (kind === "submission") {
      const { data: submission } = await admin
        .from("submissions")
        .select("id, student_id")
        .eq("id", entityId)
        .maybeSingle();

      if (!submission || submission.student_id !== user.id) {
        return NextResponse.json(
          { error: "Không có quyền." },
          { status: 403 }
        );
      }

      const { error } = await admin
        .from("submission_attachments")
        .insert({
          submission_id: entityId,
          storage_path: storagePath,
          file_name: fileName,
          mime_type: mimeType,
          file_size: fileSize,
        });

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("SAVE ATTACHMENT ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể lưu metadata file.",
      },
      { status: 500 }
    );
  }
}
