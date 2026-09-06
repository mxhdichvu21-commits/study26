import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
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

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Không tìm thấy file ảnh." },
        { status: 400 }
      );
    }

    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowed.includes(file.type)) {
      return NextResponse.json(
        { error: "Định dạng ảnh không hợp lệ." },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Ảnh vượt quá 5MB." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const bucket = "avatars";

    const { data: bucketData } = await admin.storage.getBucket(bucket);

    if (!bucketData) {
      const { error: bucketError } = await admin.storage.createBucket(bucket, {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024,
        allowedMimeTypes: allowed,
      });

      if (bucketError && !bucketError.message.toLowerCase().includes("already")) {
        return NextResponse.json(
          { error: bucketError.message },
          { status: 500 }
        );
      }
    }

    const extension =
      file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
        ? "webp"
        : "jpg";

    const path = `${user.id}/avatar-${Date.now()}.${extension}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    const { data } = admin.storage
      .from(bucket)
      .getPublicUrl(path);

    return NextResponse.json({
      ok: true,
      avatarUrl: data.publicUrl,
      path,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Lỗi máy chủ.",
      },
      { status: 500 }
    );
  }
}
