import Link from "next/link";
import { Bell, Info, AlertTriangle } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SystemAnnouncement = {
  id: string;
  title: string;
  description: string;
  type: "info" | "important" | "warning";
  is_active: boolean;
  starts_at: string;
  ends_at: string | null;
  image_path: string | null;
  created_at: string;
};

type PersonalNotification = {
  id: string;
  title: string;
  created_at: string;
};

function getTypeLabel(
  type: SystemAnnouncement["type"]
) {
  if (type === "important") return "Quan trọng";
  if (type === "warning") return "Cảnh báo";
  return "Thông tin";
}

export default async function NotificationsPage() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8fc] p-6">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-[#1f2937]">
            Bạn chưa đăng nhập
          </h1>
          <Link
            href="/login"
            className="mt-4 inline-flex rounded-xl bg-[#6941c6] px-5 py-3 text-sm font-bold text-white"
          >
            Đăng nhập
          </Link>
        </div>
      </main>
    );
  }

  const now = new Date().toISOString();

  // ==============================
  // THÔNG BÁO TOÀN HỆ THỐNG
  // ==============================
  const {
    data: systemAnnouncements,
    error: systemError,
  } = await admin
    .from("system_announcements")
    .select(
      "id, title, description, type, is_active, starts_at, ends_at, image_path, created_at"
    )
    .lte("starts_at", now)
    .or(
      `ends_at.is.null,ends_at.gte.${now}`
    )
    .order("created_at", {
      ascending: false,
    });

  if (systemError) {
    throw new Error(systemError.message);
  }

  const announcements =
    (systemAnnouncements ??
      []) as SystemAnnouncement[];

  // ==============================
  // TẠO SIGNED URL CHO ẢNH
  // ==============================
  const announcementsWithImages =
    await Promise.all(
      announcements.map(async (item) => {
        let imageUrl: string | null = null;

        if (item.image_path) {
          const { data } =
            await admin.storage
              .from("materials")
              .createSignedUrl(
                item.image_path,
                60 * 60
              );

          imageUrl =
            data?.signedUrl ?? null;
        }

        return {
          ...item,
          image_url: imageUrl,
        };
      })
    );

  // ==============================
  // THÔNG BÁO CÁ NHÂN HIỆN CÓ
  // ==============================
  const {
    data: personalNotifications,
  } = await admin
    .from("notifications")
    .select("id, title, created_at")
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false,
    });

  const personal =
    (personalNotifications ??
      []) as PersonalNotification[];

  return (
    <main className="min-h-screen bg-[#f7f8fc] px-4 py-6 md:px-8">
      <div className="mx-auto max-w-5xl">

        <Link
          href={
            user.user_metadata?.role === "teacher"
              ? "/teacher"
              : user.user_metadata?.role === "admin"
                ? "/admin"
                : "/student"
          }
          className="inline-flex text-sm font-bold text-[#6941c6] hover:underline"
        >
          ← Quay lại
        </Link>

        <div className="mt-5">
          <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[#ede9fe] text-[#6941c6]">
            <Bell
              size={24}
              strokeWidth={2.4}
            />
          </div>

          <h1 className="text-2xl font-extrabold text-[#1f2937] md:text-3xl">
            Thông báo
          </h1>

          <p className="mt-2 text-sm text-[#667085]">
            Tất cả thông báo dành cho tài khoản của bạn.
          </p>
        </div>

        {/* =============================
            THÔNG BÁO TOÀN HỆ THỐNG
           ============================= */}
        <section className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-[#1f2937]">
              Thông báo hệ thống
            </h2>
            <span className="rounded-full bg-[#ede9fe] px-2.5 py-1 text-[10px] font-extrabold text-[#6941c6]">
              STUDY26
            </span>
          </div>

          {announcementsWithImages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#dfe3ea] bg-white p-10 text-center">
              <div className="font-semibold text-[#667085]">
                Chưa có thông báo hệ thống.
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {announcementsWithImages.map(
                (item) => (
                  <article
                    key={item.id}
                    className="overflow-hidden rounded-2xl border border-[#ececf3] bg-white shadow-sm"
                  >
                    {item.image_url && (
                      <div className="bg-slate-50 p-3 sm:p-4">
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="mx-auto block max-h-[600px] w-auto max-w-full rounded-xl object-contain"
                        />
                      </div>
                    )}

                    <div className="p-5 sm:p-6">
                      <div className="flex items-center gap-2">
                        {item.type === "warning" ? (
                          <AlertTriangle
                            size={19}
                            strokeWidth={2.4}
                            className="text-amber-600"
                          />
                        ) : item.type === "important" ? (
                          <Bell
                            size={19}
                            strokeWidth={2.4}
                            className="text-[#7C3AED]"
                          />
                        ) : (
                          <Info
                            size={19}
                            strokeWidth={2.4}
                            className="text-[#6941c6]"
                          />
                        )}

                        <span className="rounded-full bg-[#ede9fe] px-2.5 py-1 text-[10px] font-extrabold text-[#6941c6]">
                          {getTypeLabel(item.type)}
                        </span>
                      </div>

                      <h3 className="mt-3 text-lg font-extrabold text-[#1f2937]">
                        {item.title}
                      </h3>

                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-[#667085]">
                        {item.description}
                      </p>

                      <div className="mt-4 text-xs text-[#98a0b3]">
                        Đăng lúc{" "}
                        {new Date(
                          item.created_at
                        ).toLocaleString("vi-VN")}
                      </div>
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </section>

        {/* =============================
            THÔNG BÁO CÁ NHÂN
           ============================= */}
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-extrabold text-[#1f2937]">
            Thông báo của bạn
          </h2>

          {personal.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#dfe3ea] bg-white p-10 text-center">
              <div className="font-semibold text-[#667085]">
                Chưa có thông báo cá nhân.
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[#ececf3] bg-white shadow-sm">
              {personal.map((item) => (
                <article
                  key={item.id}
                  className="flex gap-4 border-b border-[#f0f1f5] p-5 last:border-b-0"
                >
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-[#667085]">
                    <Bell
                      size={20}
                      strokeWidth={2.3}
                    />
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-bold text-[#1f2937]">
                      {item.title}
                    </h3>

                    <time className="mt-1 block text-xs text-[#98a0b3]">
                      {new Date(
                        item.created_at
                      ).toLocaleString("vi-VN")}
                    </time>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
