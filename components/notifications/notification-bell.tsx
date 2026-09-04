"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function NotificationBell() {
  const pathname = usePathname();

  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const isStudent =
    pathname === "/student" ||
    pathname.startsWith("/student/");

  const isTeacher =
    pathname === "/teacher" ||
    pathname.startsWith("/teacher/");

  const href = isStudent
    ? "/student/notifications"
    : isTeacher
    ? "/teacher/notifications"
    : null;

  async function loadUnread() {
    if (!href) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        "/api/notifications",
        {
          cache: "no-store",
        }
      );

      if (!res.ok) {
        setUnreadCount(0);
        return;
      }

      const data = await res.json();

      setUnreadCount(
        Number(data?.unreadCount || 0)
      );
    } catch {
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUnread();

    const interval = window.setInterval(
      loadUnread,
      15000
    );

    return () => {
      window.clearInterval(interval);
    };
  }, [href]);

  if (!href) return null;

  return (
    <Link
      href={href}
      aria-label="Thông báo"
      className="fixed right-5 top-5 z-[9999] flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-xl shadow-lg transition hover:scale-105 hover:bg-slate-50"
    >
      <span aria-hidden="true">
        🔔
      </span>

      {!loading && unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex min-w-[21px] items-center justify-center rounded-full border-2 border-white bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
          {unreadCount > 99
            ? "99+"
            : unreadCount}
        </span>
      )}
    </Link>
  );
}
