"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinRoom() {
  const router = useRouter();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const cleanCode = code.trim().toUpperCase();

    if (!cleanCode) {
      setError("Vui lòng nhập mã phòng.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/livekit/join-by-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: cleanCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Không thể vào phòng học."
        );
      }

      router.push(`/student/rooms/${data.roomId}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể vào phòng học."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="student-join-page">
      <div className="student-join-card">
        <div className="student-join-logo">
          S26
        </div>

        <span className="section-kicker">LIVE CLASS</span>

        <h1>Tham gia lớp học</h1>

        <p>
          Nhập mã phòng do giáo viên cung cấp để tham gia lớp học
          trực tuyến.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="room-code">
            Mã phòng
          </label>

          <input
            id="room-code"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.toUpperCase())
            }
            placeholder="Ví dụ: ABC123"
            maxLength={30}
            autoComplete="off"
            autoFocus
          />

          {error && (
            <div className="student-join-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="student-join-button"
            disabled={loading}
          >
            {loading ? "Đang kiểm tra..." : "Vào lớp học"}
          </button>
        </form>

        <button
          type="button"
          className="student-join-back"
          onClick={() => router.push("/student")}
        >
          ← Quay lại trang học sinh
        </button>
      </div>
    </main>
  );
}
