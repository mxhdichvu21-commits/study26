"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const {
        data: signInData,
        error: loginError,
      } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (loginError) {
        console.error("LOGIN ERROR:", loginError);
        setError("Email hoặc mật khẩu không chính xác.");
        return;
      }

      if (!signInData.user) {
        setError("Không thể đăng nhập.");
        return;
      }

      /*
       * Lấy user hiện tại lại sau khi đăng nhập để chắc chắn
       * session đã được Supabase client cập nhật.
       */
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("GET USER ERROR:", userError);
        setError("Không thể xác nhận phiên đăng nhập.");
        return;
      }

      /*
       * Lấy profile của tài khoản.
       */
      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("id, role, is_active, full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("PROFILE LOGIN ERROR:", {
          message: profileError.message,
          code: profileError.code,
          details: profileError.details,
          hint: profileError.hint,
        });

        setError(
          "Không thể đọc hồ sơ tài khoản. Hãy kiểm tra cấu hình quyền Supabase."
        );
        return;
      }

      if (!profile) {
        console.error("PROFILE NOT FOUND:", user.id);
        setError("Tài khoản chưa có hồ sơ Study26.");
        return;
      }

      if (profile.is_active === false) {
        setError("Tài khoản của bạn chưa được kích hoạt.");
        return;
      }

      /*
       * Điều hướng theo role.
       */
      if (profile.role === "admin") {
        router.replace("/admin");
      } else if (profile.role === "teacher") {
        router.replace("/teacher");
      } else {
        router.replace("/student");
      }

      router.refresh();
    } catch (err) {
      console.error("LOGIN UNKNOWN ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Không thể đăng nhập."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="login-email">Email</label>

        <input
          id="login-email"
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
        />
      </div>

      <div className="field">
        <label htmlFor="login-password">Mật khẩu</label>

        <input
          id="login-password"
          required
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nhập mật khẩu"
          autoComplete="current-password"
        />
      </div>

      {error && (
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            background: "#fff1f2",
            color: "#be123c",
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          {error}
        </div>
      )}

      <div className="helper">
        <label>
          <input
            type="checkbox"
            style={{ marginRight: 8 }}
          />
          Ghi nhớ đăng nhập
        </label>

        <a className="link" href="#">
          Quên mật khẩu?
        </a>
      </div>

      <button
        className="btn primary"
        type="submit"
        disabled={loading}
      >
        {loading ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>
    </form>
  );
}
