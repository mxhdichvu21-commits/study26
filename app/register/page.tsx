"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!fullName.trim() || !email.trim() || !password) {
      setError("Vui lòng điền đầy đủ thông tin.");
      return;
    }

    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
        error: signUpError,
      } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: "student",
          },
        },
      });

      if (signUpError) {
        throw new Error(signUpError.message);
      }

      if (!user) {
        throw new Error("Không thể tạo tài khoản.");
      }

      // Tự tạo profile cho tài khoản mới.
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            full_name: fullName.trim(),
            role: "student",
            is_active: true,
          },
          {
            onConflict: "id",
          }
        );

      if (profileError) {
        throw new Error(
          `Tài khoản đã tạo nhưng chưa tạo được hồ sơ: ${profileError.message}`
        );
      }

      // Tự tạo record students nếu bảng yêu cầu.
      const { error: studentError } = await supabase
        .from("students")
        .upsert(
          {
            id: user.id,
          },
          {
            onConflict: "id",
          }
        );

      if (studentError) {
        console.warn("Không tạo được students:", studentError.message);
      }

      // Nếu Supabase cho session ngay sau signup -> vào luôn.
      if (user && !user.confirmed_at && !user.email_confirmed_at) {
        setSuccess(
          "Đăng ký thành công. Kiểm tra email để xác nhận tài khoản trước khi đăng nhập."
        );
        return;
      }

      router.push("/student");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Đăng ký không thành công."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <img
            src="/images/study26-logo.png"
            alt="Study26"
            className="auth-logo"
          />
        </div>

        <span className="section-kicker">STUDY26</span>

        <h1>Tạo tài khoản</h1>
        <p className="auth-subtitle">
          Đăng ký tài khoản học sinh để bắt đầu học tập.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="fullName">Họ và tên</label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nguyễn Văn A"
              autoComplete="name"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ban@example.com"
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">Mật khẩu</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ít nhất 6 ký tự"
              autoComplete="new-password"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="confirmPassword">Nhập lại mật khẩu</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu"
              autoComplete="new-password"
            />
          </div>

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading ? "Đang tạo tài khoản..." : "Đăng ký"}
          </button>
        </form>

        <p className="auth-switch">
          Đã có tài khoản?{" "}
          <Link href="/login">Đăng nhập</Link>
        </p>
      </section>
    </main>
  );
}
