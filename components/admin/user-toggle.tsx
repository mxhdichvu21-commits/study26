"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  userId: string;
  isActive: boolean;
  isSelf: boolean;
};

export default function UserToggle({
  userId,
  isActive,
  isSelf,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (loading || isSelf) return;

    const nextValue = !isActive;

    const confirmed = window.confirm(
      nextValue
        ? "Mở lại tài khoản này?"
        : "Khóa tài khoản này?"
    );

    if (!confirmed) return;

    try {
      setLoading(true);

      const res = await fetch(
        "/api/admin/users/toggle",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            isActive: nextValue,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error ||
            "Không thể cập nhật tài khoản."
        );
      }

      router.refresh();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading || isSelf}
      className={
        isActive
          ? "rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          : "rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
      }
    >
      {loading
        ? "Đang cập nhật..."
        : isActive
        ? "Khóa"
        : "Mở khóa"}
    </button>
  );
}
