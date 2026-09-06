"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UserToggleButton({
  userId,
  active,
}: {
  userId: string;
  active: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (loading) return;

    const confirmed = window.confirm(
      active
        ? "Bạn có chắc muốn khóa tài khoản này?"
        : "Bạn có chắc muốn mở lại tài khoản này?"
    );

    if (!confirmed) return;

    try {
      setLoading(true);

      const response = await fetch(
        "/api/admin/users/toggle",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            isActive: !active,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.error || "Không thể cập nhật tài khoản."
        );
      }

      router.refresh();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật tài khoản."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
        active
          ? "bg-rose-50 text-rose-600 hover:bg-rose-100"
          : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {loading
        ? "Đang xử lý..."
        : active
          ? "Khóa"
          : "Mở khóa"}
    </button>
  );
}
