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
  const [confirmPassword, setConfirmPassword] = useState("");

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
      setError("Vui lòng nhập họ và tên.");
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
        throw new Error("Không thể tạo tài khoản.");
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
    <div className="w-full min-w-0">
      <div className="mb-7 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-black text-white shadow-lg">
          S
        </div>

        <div className="text-xs font-bold tracking-[0.2em] text-blue-600">
          STUDY26
        </div>

        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Tạo tài khoản
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Đăng ký tài khoản học sinh để bắt đầu học tập.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="w-full min-w-0 space-y-4"
      >
        <div className="w-full">
          <label
            htmlFor="fullName"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Họ và tên
          </label>

          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(event) =>
              setFullName(event.target.value)
            }
            placeholder="Nguyễn Văn A"
            autoComplete="name"
            required
            className="block h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="w-full">
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Email
          </label>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            placeholder="ban@example.com"
            autoComplete="email"
            inputMode="email"
            required
            className="block h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="w-full">
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Mật khẩu
          </label>

          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            placeholder="Ít nhất 6 ký tự"
            autoComplete="new-password"
            required
            className="block h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="w-full">
          <label
            htmlFor="confirmPassword"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Nhập lại mật khẩu
          </label>

          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(event) =>
              setConfirmPassword(event.target.value)
            }
            placeholder="Nhập lại mật khẩu"
            autoComplete="new-password"
            required
            className="block h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {error && (
          <div className="w-full rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="w-full rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-700">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-xl bg-blue-600 px-4 text-base font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? "Đang tạo tài khoản..."
            : "Đăng ký"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-slate-500">
        Đã có tài khoản?{" "}
        <Link
          href="/login"
          className="font-semibold text-blue-600 hover:underline"
        >
          Đăng nhập
        </Link>
      </div>
    </div>
  );
}
