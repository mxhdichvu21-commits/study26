"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinClassForm() {
  const router = useRouter();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setSuccess("");

    const cleanCode = code.trim().toUpperCase();

    if (!cleanCode) {
      setError("Vui lòng nhập mã lớp.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/student/join-class", {
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
          data.error || "Không thể tham gia lớp."
        );
      }

      setSuccess(
        data.alreadyJoined
          ? `Bạn đã tham gia lớp ${data.class.name}.`
          : `Đã tham gia lớp ${data.class.name} thành công.`
      );

      setCode("");

      setTimeout(() => {
        router.push("/student");
        router.refresh();
      }, 900);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tham gia lớp."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="student-join-page">
      <div className="student-join-card">
        <div className="student-join-logo">S26</div>

        <span className="section-kicker">JOIN CLASS</span>

        <h1>Tham gia lớp học</h1>

        <p>
          Nhập mã lớp do giáo viên cung cấp. Bạn chỉ cần nhập
          một lần, sau đó lớp sẽ tự xuất hiện trong tài khoản.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="class-code">
            Mã lớp
          </label>

          <input
            id="class-code"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.toUpperCase())
            }
            placeholder="Ví dụ: TOAN12A1"
            maxLength={50}
            autoComplete="off"
            autoFocus
          />

          {error && (
            <div className="student-join-error">
              {error}
            </div>
          )}

          {success && (
            <div className="auth-success">
              {success}
            </div>
          )}

          <button
            type="submit"
            className="student-join-button"
            disabled={loading}
          >
            {loading ? "Đang tham gia..." : "Tham gia lớp"}
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
