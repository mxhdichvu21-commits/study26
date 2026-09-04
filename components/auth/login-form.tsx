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

    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (loginError) {
      setError("Email hoặc mật khẩu không chính xác.");
      setLoading(false);
      return;
    }

    if (!data.user) {
      setError("Không thể đăng nhập.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      setError("Tài khoản chưa có hồ sơ Study26.");
      setLoading(false);
      return;
    }

    if (!profile.is_active) {
      await supabase.auth.signOut();
      setError("Tài khoản của bạn chưa được kích hoạt.");
      setLoading(false);
      return;
    }

    if (profile.role === "admin") {
      router.replace("/admin");
    } else if (profile.role === "teacher") {
      router.replace("/teacher");
    } else {
      router.replace("/student");
    }

    router.refresh();
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="field">
        <label>Email</label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>

      <div className="field">
        <label>Mật khẩu</label>
        <input
          required
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nhập mật khẩu"
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
          }}
        >
          {error}
        </div>
      )}

      <div className="helper">
        <label>
          <input type="checkbox" style={{ marginRight: 8 }} />
          Ghi nhớ đăng nhập
        </label>

        <a className="link" href="#">
          Quên mật khẩu?
        </a>
      </div>

      <button className="btn primary" type="submit" disabled={loading}>
        {loading ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>
    </form>
  );
}
