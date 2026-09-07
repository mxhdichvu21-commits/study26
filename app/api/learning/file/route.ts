import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "materials";
const SIGNED_URL_EXPIRES = 60 * 10; // 10 phút

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const kind = String(searchParams.get("kind") || "").trim();
    const id = String(searchParams.get("id") || "").trim();

    if (!kind || !id) {
      return NextResponse.json(
        { error: "Thiếu loại file hoặc ID." },
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

    // =========================
    // ASSIGNMENT
    // =========================
    if (kind === "assignment") {
      const { data: assignment } = await admin
        .from("assignments")
        .select("id, class_id, created_by")
        .eq("id", id)
        .maybeSingle();

      if (!assignment) {
        return NextResponse.json(
          { error: "Không tìm thấy bài tập." },
          { status: 404 }
        );
      }

      let allowed = assignment.created_by === user.id;

      if (!allowed) {
        const { data: recipient } = await admin
          .from("assignment_recipients")
          .select("assignment_id")
          .eq("assignment_id", id)
          .eq("student_id", user.id)
          .maybeSingle();

        allowed = !!recipient;
      }

      if (!allowed) {
        const { data: classMember } = await admin
          .from("class_members")
          .select("role")
          .eq("class_id", assignment.class_id)
          .eq("user_id", user.id)
          .maybeSingle();

        allowed = !!classMember;
      }

      if (!allowed) {
        const { data: profile } = await admin
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        allowed = profile?.role === "admin";
      }

      if (!allowed) {
        return NextResponse.json(
          { error: "Bạn không có quyền xem file bài tập." },
          { status: 403 }
        );
      }

      const { data: attachments, error } = await admin
        .from("assignment_attachments")
        .select(
          "id, storage_path, file_name, mime_type, file_size, created_at"
        )
        .eq("assignment_id", id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (!attachments?.length) {
        return NextResponse.json(
          { error: "Bài tập chưa có file đính kèm." },
          { status: 404 }
        );
      }

      const files = [];

      for (const attachment of attachments) {
        const { data: signed, error: signedError } =
          await admin.storage
            .from(BUCKET)
            .createSignedUrl(
              attachment.storage_path,
              SIGNED_URL_EXPIRES,
              {
                download: attachment.file_name,
              }
            );

        if (signedError) {
          console.error(
            "CREATE SIGNED URL ERROR:",
            signedError
          );
          continue;
        }

        files.push({
          id: attachment.id,
          fileName: attachment.file_name,
          mimeType: attachment.mime_type,
          fileSize: attachment.file_size,
          url: signed.signedUrl,
        });
      }

      if (!files.length) {
        return NextResponse.json(
          { error: "Không thể tạo link file." },
          { status: 500 }
        );
      }

      // Tương thích cả trường hợp frontend đang mở trực tiếp
      // và trường hợp frontend muốn lấy danh sách nhiều file.
      if (files.length === 1) {
        return NextResponse.redirect(files[0].url);
      }

      return NextResponse.json({
        success: true,
        files,
      });
    }

    // =========================
    // LESSON
    // =========================
    if (kind === "lesson") {
      const { data: lesson } = await admin
        .from("lessons")
        .select("id, class_id, created_by")
        .eq("id", id)
        .maybeSingle();

      if (!lesson) {
        return NextResponse.json(
          { error: "Không tìm thấy bài học." },
          { status: 404 }
        );
      }

      let allowed = lesson.created_by === user.id;

      if (!allowed) {
        const { data: recipient } = await admin
          .from("lesson_recipients")
          .select("lesson_id")
          .eq("lesson_id", id)
          .eq("student_id", user.id)
          .maybeSingle();

        allowed = !!recipient;
      }

      if (!allowed) {
        const { data: classMember } = await admin
          .from("class_members")
          .select("role")
          .eq("class_id", lesson.class_id)
          .eq("user_id", user.id)
          .maybeSingle();

        allowed = !!classMember;
      }

      if (!allowed) {
        return NextResponse.json(
          { error: "Bạn không có quyền xem file bài học." },
          { status: 403 }
        );
      }

      const { data: attachments, error } = await admin
        .from("lesson_attachments")
        .select(
          "id, storage_path, file_name, mime_type, file_size, created_at"
        )
        .eq("lesson_id", id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (!attachments?.length) {
        return NextResponse.json(
          { error: "Bài học chưa có file đính kèm." },
          { status: 404 }
        );
      }

      const files = [];

      for (const attachment of attachments) {
        const { data: signed, error: signedError } =
          await admin.storage
            .from(BUCKET)
            .createSignedUrl(
              attachment.storage_path,
              SIGNED_URL_EXPIRES,
              {
                download: attachment.file_name,
              }
            );

        if (signedError) continue;

        files.push({
          id: attachment.id,
          fileName: attachment.file_name,
          mimeType: attachment.mime_type,
          fileSize: attachment.file_size,
          url: signed.signedUrl,
        });
      }

      if (!files.length) {
        return NextResponse.json(
          { error: "Không thể tạo link file." },
          { status: 500 }
        );
      }

      if (files.length === 1) {
        return NextResponse.redirect(files[0].url);
      }

      return NextResponse.json({
        success: true,
        files,
      });
    }

    // =========================
    // SUBMISSION
    // =========================
    if (kind === "submission") {
      const { data: submission } = await admin
        .from("submissions")
        .select("id, student_id, assignment_id")
        .eq("id", id)
        .maybeSingle();

      if (!submission) {
        return NextResponse.json(
          { error: "Không tìm thấy bài nộp." },
          { status: 404 }
        );
      }

      let allowed = submission.student_id === user.id;

      if (!allowed) {
        const { data: assignment } = await admin
          .from("assignments")
          .select("created_by")
          .eq("id", submission.assignment_id)
          .maybeSingle();

        allowed = assignment?.created_by === user.id;
      }

      if (!allowed) {
        const { data: profile } = await admin
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        allowed = profile?.role === "admin";
      }

      if (!allowed) {
        return NextResponse.json(
          { error: "Bạn không có quyền xem file bài nộp." },
          { status: 403 }
        );
      }

      const { data: attachments, error } = await admin
        .from("submission_attachments")
        .select(
          "id, storage_path, file_name, mime_type, file_size, created_at"
        )
        .eq("submission_id", id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (!attachments?.length) {
        return NextResponse.json(
          { error: "Bài nộp chưa có file." },
          { status: 404 }
        );
      }

      const files = [];

      for (const attachment of attachments) {
        const { data: signed, error: signedError } =
          await admin.storage
            .from(BUCKET)
            .createSignedUrl(
              attachment.storage_path,
              SIGNED_URL_EXPIRES,
              {
                download: attachment.file_name,
              }
            );

        if (signedError) continue;

        files.push({
          id: attachment.id,
          fileName: attachment.file_name,
          mimeType: attachment.mime_type,
          fileSize: attachment.file_size,
          url: signed.signedUrl,
        });
      }

      if (!files.length) {
        return NextResponse.json(
          { error: "Không thể tạo link file." },
          { status: 500 }
        );
      }

      if (files.length === 1) {
        return NextResponse.redirect(files[0].url);
      }

      return NextResponse.json({
        success: true,
        files,
      });
    }

    return NextResponse.json(
      { error: "Loại file không được hỗ trợ." },
      { status: 400 }
    );
  } catch (error) {
    console.error("LEARNING FILE ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể mở file.",
      },
      { status: 500 }
    );
  }
}
