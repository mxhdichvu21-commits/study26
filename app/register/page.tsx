import Link from "next/link";

import RegisterForm from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <main className="min-h-[100dvh] w-full overflow-x-hidden bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-md items-center justify-center">
        <div className="auth-card w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-5">
            <Link
              href="/"
              className="inline-flex min-h-10 items-center text-sm font-medium text-slate-500 hover:text-blue-600"
            >
              ← Về trang chủ
            </Link>
          </div>

          <RegisterForm />
        </div>
      </div>
    </main>
  );
}
