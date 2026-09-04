"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default function RegisterForm() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
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
      setError(
        "Mật khẩu phải có ít nhất 6 ký tự."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        "Mật khẩu xác nhận không khớp."
      );
      return;
    }

    try {
      setLoading(true);

      const {
        data,
        error: signUpError,
      } = await supabase.auth.signUp({
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
        throw new Error(
          "Không thể tạo tài khoản."
        );
      }

      const userId = data.user.id;

      const { error: profileError } =
        await supabase.from("profiles").upsert(
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
        console.error(
          "PROFILE CREATE ERROR:",
          profileError
        );
      }

      const { error: studentError } =
        await supabase.from("students").upsert(
          {
            id: userId,
          },
          {
            onConflict: "id",
          }
        );

      if (studentError) {
        console.error(
          "STUDENT CREATE ERROR:",
          studentError
        );
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
    <form
      onSubmit={handleSubmit}
      className="w-full space-y-5"
    >
      <div>
        <label
          htmlFor="fullName"
          className="mb-2 block text-sm font-bold text-slate-700"
        >
          Tên người dùng
        </label>

        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <circle cx="12" cy="8" r="3" />
              <path d="M5 20c.7-4.2 3-6.5 7-6.5s6.3 2.3 7 6.5" />
            </svg>
          </span>

          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(event) =>
              setFullName(event.target.value)
            }
            placeholder="Nhập tên người dùng"
            autoComplete="name"
            required
            className="h-14 w-full min-w-0 rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-base text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="email"
          className="mb-2 block text-sm font-bold text-slate-700"
        >
          Email
        </label>

        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <rect
                x="3"
                y="5"
                width="18"
                height="14"
                rx="2"
              />
              <path d="m4 7 8 6 8-6" />
            </svg>
          </span>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            placeholder="Nhập địa chỉ email"
            autoComplete="email"
            inputMode="email"
            required
            className="h-14 w-full min-w-0 rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-base text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-2 block text-sm font-bold text-slate-700"
        >
          Mật khẩu
        </label>

        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <rect
                x="5"
                y="10"
                width="14"
                height="10"
                rx="2"
              />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
          </span>

          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            placeholder="Nhập mật khẩu"
            autoComplete="new-password"
            required
            className="h-14 w-full min-w-0 rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-base text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="mb-2 block text-sm font-bold text-slate-700"
        >
          Nhập lại mật khẩu
        </label>

        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <rect
                x="5"
                y="10"
                width="14"
                height="10"
                rx="2"
              />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
          </span>

          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(event) =>
              setConfirmPassword(
                event.target.value
              )
            }
            placeholder="Nhập lại mật khẩu"
            autoComplete="new-password"
            required
            className="h-14 w-full min-w-0 rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-base text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700">
          {success}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="h-14 w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-5 text-base font-bold text-white shadow-lg shadow-blue-200 transition hover:from-blue-700 hover:to-blue-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading
          ? "Đang đăng ký..."
          : "Đăng ký"}
      </button>

      <div className="text-center text-sm text-slate-500">
        Đã có tài khoản?{" "}
        <Link
          href="/login"
          className="font-bold text-blue-600 hover:underline"
        >
          Đăng nhập
        </Link>
      </div>
    </form>
  );
}
