"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  Info,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Announcement = {
  id: string;
  title: string;
  description: string;
  type: "info" | "important" | "warning";
  image_url: string | null;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
};

const PUBLIC_AUTH_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

export default function SystemAnnouncementPopup() {
  const pathname = usePathname();

  const [announcement, setAnnouncement] =
    useState<Announcement | null>(null);

  const [checking, setChecking] =
    useState(false);

  function isPublicAuthPage() {
    return PUBLIC_AUTH_PATHS.some(
      (path) =>
        pathname === path ||
        pathname.startsWith(`${path}/`)
    );
  }

  async function checkUnread() {
    if (isPublicAuthPage()) {
      setAnnouncement(null);
      setChecking(false);
      return;
    }

    try {
      setChecking(true);

      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Chưa đăng nhập -> không bao giờ hiện popup
      if (!user) {
        setAnnouncement(null);
        return;
      }

      const response = await fetch(
        "/api/announcements/unread",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      if (!response.ok) {
        setAnnouncement(null);
        return;
      }

      const data = await response.json();

      setAnnouncement(
        data?.announcement ?? null
      );
    } catch (error) {
      console.error(
        "SYSTEM ANNOUNCEMENT POPUP ERROR:",
        error
      );

      setAnnouncement(null);
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    // Không kiểm tra ở trang đăng nhập/đăng ký
    if (isPublicAuthPage()) {
      setAnnouncement(null);
      return;
    }

    // Khi pathname chuyển từ /login
    // sang /student /teacher /admin...
    // sẽ kiểm tra thông báo.
    void checkUnread();
  }, [pathname]);

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Chỉ phản ứng khi thực sự đăng nhập
        if (
          event === "SIGNED_IN" &&
          session
        ) {
          // Chờ router chuyển sang trang chính
          window.setTimeout(() => {
            void checkUnread();
          }, 500);
        }

        if (
          event === "SIGNED_OUT"
        ) {
          setAnnouncement(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname]);

  async function markAsRead() {
    if (!announcement) {
      return;
    }

    const id = announcement.id;

    setAnnouncement(null);

    try {
      await fetch(
        `/api/announcements/${id}/read`,
        {
          method: "POST",
        }
      );
    } catch (error) {
      console.error(
        "MARK ANNOUNCEMENT ERROR:",
        error
      );
    }
  }

  // Tuyệt đối không hiện ở trang auth
  if (
    checking ||
    !announcement ||
    isPublicAuthPage()
  ) {
    return null;
  }

  const isWarning =
    announcement.type === "warning";

  const isImportant =
    announcement.type === "important";

  const badgeText = isWarning
    ? "CẢNH BÁO"
    : isImportant
      ? "QUAN TRỌNG"
      : "THÔNG BÁO STUDY26";

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-[3px] sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="study26-announcement-title"
        className="
          relative
          flex
          w-full
          max-w-[430px]
          flex-col
          overflow-hidden
          rounded-[22px]
          bg-white
          shadow-[0_20px_60px_rgba(15,23,42,0.30)]
        "
        style={{
          maxHeight:
            "calc(100dvh - 24px)",
        }}
      >

        {/* NÚT ĐÓNG */}
        <button
          type="button"
          aria-label="Đóng thông báo"
          onClick={() =>
            void markAsRead()
          }
          className="
            absolute
            right-3
            top-3
            z-50
            grid
            h-8
            w-8
            place-items-center
            rounded-full
            bg-white
            text-slate-500
            shadow-md
            ring-1
            ring-slate-200
            transition
            hover:bg-slate-100
          "
        >
          <X
            size={17}
            strokeWidth={2.7}
          />
        </button>

        {/* HEADER */}
        <div className="shrink-0 px-4 pb-3 pt-5 text-center sm:px-5 sm:pb-3 sm:pt-6">

          <div
            className={
              isWarning
                ? "mx-auto mb-2 grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-amber-700"
                : "mx-auto mb-2 grid h-9 w-9 place-items-center rounded-xl bg-[#ede9fe] text-[#6941c6]"
            }
          >
            {isWarning ? (
              <AlertTriangle
                size={19}
                strokeWidth={2.4}
              />
            ) : isImportant ? (
              <Bell
                size={19}
                strokeWidth={2.4}
              />
            ) : (
              <Info
                size={19}
                strokeWidth={2.4}
              />
            )}
          </div>

          <div className="inline-flex rounded-full bg-[#ede9fe] px-2.5 py-1 text-[9px] font-extrabold tracking-wide text-[#6941c6]">
            {badgeText}
          </div>

          <h2
            id="study26-announcement-title"
            className="mt-2 break-words px-5 text-base font-extrabold leading-tight text-[#1f2937] sm:text-lg"
          >
            {announcement.title}
          </h2>
        </div>

        {/* ẢNH - HIỆN ĐỦ, KHÔNG CROP */}
        {announcement.image_url && (
          <div className="flex min-h-0 shrink items-center justify-center overflow-hidden bg-white px-3 sm:px-4">
            <img
              src={announcement.image_url}
              alt={announcement.title}
              className="
                block
                h-auto
                w-auto
                max-w-full
                object-contain
              "
              style={{
                maxHeight:
                  "calc(100dvh - 285px)",
              }}
            />
          </div>
        )}

        {/* NỘI DUNG */}
        <div className="shrink-0 px-4 pb-4 pt-3 text-center sm:px-5 sm:pb-5">

          <p className="max-h-[70px] overflow-hidden whitespace-pre-wrap break-words text-xs leading-5 text-[#667085] sm:text-sm">
            {announcement.description}
          </p>

          <div className="mt-2 text-[9px] text-[#98a0b3] sm:text-[10px]">
            Đăng lúc{" "}
            {new Date(
              announcement.created_at
            ).toLocaleString("vi-VN")}
          </div>

          <button
            type="button"
            onClick={() =>
              void markAsRead()
            }
            className="
              mt-3
              h-10
              w-full
              rounded-xl
              bg-[#6941c6]
              px-4
              text-sm
              font-bold
              text-white
              transition
              hover:bg-[#5b21b6]
            "
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
}
