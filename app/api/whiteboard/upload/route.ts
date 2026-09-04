import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "whiteboard-images";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const roomId = formData.get("roomId");
    const file = formData.get("file");

    if (
      typeof roomId !== "string" ||
      !roomId ||
      !(file instanceof File)
    ) {
      return NextResponse.json(
        { error: "Thiếu roomId hoặc file." },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Chỉ cho phép tải ảnh lên." },
        { status: 400 }
      );
    }

    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Ảnh tối đa 8MB." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Chưa đăng nhập." },
        { status: 401 }
      );
    }

    const { data: room } = await supabase
      .from("rooms")
      .select("id, class_id, teacher_id")
      .eq("id", roomId)
      .single();

    if (!room) {
      return NextResponse.json(
        { error: "Không tìm thấy phòng." },
        { status: 404 }
      );
    }

    if (room.teacher_id !== user.id) {
      return NextResponse.json(
        { error: "Chỉ giáo viên mới được thêm ảnh vào bảng." },
        { status: 403 }
      );
    }

    const admin = createAdminClient();

    const safeName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .toLowerCase();

    const path = `${roomId}/${crypto.randomUUID()}-${safeName}`;

    const bytes = await file.arrayBuffer();

    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(path, bytes, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: signed, error: signedError } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 60 * 24);

    if (signedError || !signed) {
      throw signedError || new Error("Không tạo được signed URL.");
    }

    return NextResponse.json({
      path,
      url: signed.signedUrl,
    });
  } catch (error) {
    console.error("WHITEBOARD UPLOAD ERROR:", error);

    return NextResponse.json(
      { error: "Không thể tải ảnh lên bảng trắng." },
      { status: 500 }
    );
  }
}
