import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "materials";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

async function getAdmin() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { admin, user: null, profile: null };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  return { admin, user, profile };
}

async function signImage(
  admin: ReturnType<typeof createAdminClient>,
  imagePath: string | null
) {
  if (!imagePath) return null;

  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(imagePath, 60 * 60);

  if (error) {
    console.error("SIGN IMAGE ERROR:", error);
    return null;
  }

  return data?.signedUrl ?? null;
}

export async function GET() {
  try {
    const { admin, user, profile } = await getAdmin();

    if (!user) {
      return NextResponse.json(
        { error: "Chưa đăng nhập." },
        { status: 401 }
      );
    }

    if (
      !profile ||
      profile.role !== "admin" ||
      profile.is_active === false
    ) {
      return NextResponse.json(
        { error: "Không có quyền." },
        { status: 403 }
      );
    }

    const { data, error } = await admin
      .from("system_announcements")
      .select(
        "id,title,description,type,is_active,starts_at,ends_at,image_path,created_at"
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    const announcements = await Promise.all(
      (data ?? []).map(async (item) => ({
        ...item,
        image_url: await signImage(
          admin,
          item.image_path
        ),
      }))
    );

    return NextResponse.json({ announcements });
  } catch (error) {
    console.error("GET ANNOUNCEMENTS ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể tải thông báo.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  let uploadedPath: string | null = null;

  try {
    const { admin, user, profile } = await getAdmin();

    if (!user) {
      return NextResponse.json(
        { error: "Chưa đăng nhập." },
        { status: 401 }
      );
    }

    if (
      !profile ||
      profile.role !== "admin" ||
      profile.is_active === false
    ) {
      return NextResponse.json(
        { error: "Không có quyền." },
        { status: 403 }
      );
    }

    const form = await request.formData();

    const title =
      typeof form.get("title") === "string"
        ? String(form.get("title")).trim()
        : "";

    const description =
      typeof form.get("description") === "string"
        ? String(form.get("description")).trim()
        : "";

    const type =
      typeof form.get("type") === "string"
        ? String(form.get("type")).trim()
        : "info";

    const endsAt =
      typeof form.get("endsAt") === "string"
        ? String(form.get("endsAt")).trim()
        : "";

    if (!title || !description) {
      return NextResponse.json(
        { error: "Hãy nhập tiêu đề và nội dung." },
        { status: 400 }
      );
    }

    if (!["info", "important", "warning"].includes(type)) {
      return NextResponse.json(
        { error: "Loại thông báo không hợp lệ." },
        { status: 400 }
      );
    }

    let endValue: string | null = null;

    if (endsAt) {
      const endDate = new Date(endsAt);

      if (Number.isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: "Thời gian hết hạn không hợp lệ." },
          { status: 400 }
        );
      }

      endValue = endDate.toISOString();
    }

    const image = form.get("image");

    if (image instanceof File && image.size > 0) {
      if (!ALLOWED_TYPES.includes(image.type)) {
        return NextResponse.json(
          {
            error:
              "Ảnh chỉ hỗ trợ JPG, JPEG, PNG hoặc WEBP.",
          },
          { status: 400 }
        );
      }

      if (image.size > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { error: "Ảnh tối đa 5MB." },
          { status: 400 }
        );
      }

      const ext =
        image.type === "image/png"
          ? "png"
          : image.type === "image/webp"
            ? "webp"
            : "jpg";

      uploadedPath =
        `announcements/${crypto.randomUUID()}.${ext}`;

      const bytes = new Uint8Array(
        await image.arrayBuffer()
      );

      const { error: uploadError } =
        await admin.storage
          .from(BUCKET)
          .upload(uploadedPath, bytes, {
            contentType: image.type,
            upsert: false,
          });

      if (uploadError) throw uploadError;
    }

    const { data, error } = await admin
      .from("system_announcements")
      .insert({
        title,
        description,
        type,
        is_active: true,
        starts_at: new Date().toISOString(),
        ends_at: endValue,
        image_path: uploadedPath,
        created_by: user.id,
      })
      .select(
        "id,title,description,type,is_active,starts_at,ends_at,image_path,created_at"
      )
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      announcement: {
        ...data,
        image_url: await signImage(
          admin,
          uploadedPath
        ),
      },
    });
  } catch (error) {
    if (uploadedPath) {
      await adminCleanup(uploadedPath);
    }

    console.error("CREATE ANNOUNCEMENT ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể tạo thông báo.",
      },
      { status: 500 }
    );
  }
}

async function adminCleanup(path: string) {
  try {
    const admin = createAdminClient();

    await admin.storage
      .from(BUCKET)
      .remove([path]);
  } catch (error) {
    console.error("CLEANUP ANNOUNCEMENT IMAGE ERROR:", error);
  }
}
