"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function InputIcon({
  type,
}: {
  type: "user" | "email" | "lock";
}) {
  if (type === "user") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="12" cy="8" r="3" />
        <path d="M5 20c.7-4.2 3-6.5 7-6.5s6.3 2.3 7 6.5" />
      </svg>
    );
  }

  if (type === "email") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m4 7 8 6 8-6" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.7" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m3 3 18 18" />
      <path d="M10.7 5.9A10.5 10.5 0 0 1 12 5.8c6.1 0 9.5 6.2 9.5 6.2a17 17 0 0 1-3 3.7" />
      <path d="M6.2 6.8C3.7 8.5 2.5 12 2.5 12s3.4 6.2 9.5 6.2c1.4 0 2.7-.3 3.8-.8" />
    </svg>
  );
}

export default function RegisterForm() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!fullName.trim()) {
      setError("Vui lòng nhập tên người dùng.");
      return;
    }

    if (!email.trim()) {
      setError("Vui lòng nhập email.");
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

    try {
      setLoading(true);

      const { data, error: signUpError } =
        await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
            },
          },
        });

      if (signUpError) {
        throw signUpError;
      }

      if (!data.user) {
        throw new Error("Không thể tạo tài khoản.");
      }

      const userId = data.user.id;

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: userId,
            role: "student",
            full_name: fullName.trim(),
            is_active: true,
          },
          {
            onConflict: "id",
          }
        );

      if (profileError) {
        console.error("PROFILE CREATE ERROR:", profileError);
      }

      const { error: studentError } = await supabase
        .from("students")
        .upsert(
          {
            id: userId,
          },
          {
            onConflict: "id",
          }
        );

      if (studentError) {
        console.error("STUDENT CREATE ERROR:", studentError);
      }

      if (data.session) {
        router.replace("/student");
        router.refresh();
        return;
      }

      setSuccess(
        "Đăng ký thành công. Vui lòng kiểm tra email để xác nhận tài khoản."
      );

      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể đăng ký tài khoản."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="study26-register-form" onSubmit={handleSubmit}>

      <div className="study26-input-group">
        <label htmlFor="fullName">Tên người dùng</label>

        <div className="study26-input-wrapper">
          <span className="study26-input-icon">
            <InputIcon type="user" />
          </span>

          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nhập tên người dùng"
            autoComplete="name"
            required
          />
        </div>
      </div>

      <div className="study26-input-group">
        <label htmlFor="email">Email</label>

        <div className="study26-input-wrapper">
          <span className="study26-input-icon">
            <InputIcon type="email" />
          </span>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Nhập email của bạn"
            autoComplete="email"
            inputMode="email"
            required
          />
        </div>
      </div>

      <div className="study26-input-group">
        <label htmlFor="password">Mật khẩu</label>

        <div className="study26-input-wrapper">
          <span className="study26-input-icon">
            <InputIcon type="lock" />
          </span>

          <input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nhập mật khẩu"
            autoComplete="new-password"
            required
          />

          <button
            type="button"
            className="study26-password-toggle"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          >
            <EyeIcon open={showPassword} />
          </button>
        </div>
      </div>

      <div className="study26-input-group">
        <label htmlFor="confirmPassword">Nhập lại mật khẩu</label>

        <div className="study26-input-wrapper">
          <span className="study26-input-icon">
            <InputIcon type="lock" />
          </span>

          <input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Nhập lại mật khẩu"
            autoComplete="new-password"
            required
          />

          <button
            type="button"
            className="study26-password-toggle"
            onClick={() => setShowConfirmPassword((value) => !value)}
            aria-label={
              showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
            }
          >
            <EyeIcon open={showConfirmPassword} />
          </button>
        </div>
      </div>

      {error && (
        <div className="study26-register-error">
          {error}
        </div>
      )}

      {success && (
        <div className="study26-register-success">
          {success}
        </div>
      )}

      <button
        type="submit"
        className="study26-register-button"
        disabled={loading}
      >
        {loading ? "Đang đăng ký..." : "Đăng ký"}
      </button>

      <div className="study26-login-text">
        Đã có tài khoản?{" "}
        <Link href="/login">Đăng nhập</Link>
      </div>
    </form>
  );
}
