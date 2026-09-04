import Link from "next/link";

import RegisterForm from "@/components/auth/register-form";

function LogoMark() {
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-blue-600 to-cyan-400 shadow-lg shadow-blue-200">
      <svg
        viewBox="0 0 64 64"
        className="h-10 w-10"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M12 18 32 10l20 8-20 8-20-8Z"
          fill="white"
        />
        <path
          d="M18 24v18c0 3 6 8 14 11 8-3 14-8 14-11V24L32 31 18 24Z"
          fill="white"
          opacity=".94"
        />
        <path
          d="M32 31v22"
          stroke="#60A5FA"
          strokeWidth="3"
        />
        <circle
          cx="45"
          cy="44"
          r="7"
          fill="#2563EB"
        />
        <path
          d="m43 42 5 3-5 3v-6Z"
          fill="white"
        />
      </svg>
    </div>
  );
}

function FeatureIcon({
  type,
}: {
  type: "video" | "people" | "shield";
}) {
  if (type === "video") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <rect
          x="3"
          y="6"
          width="13"
          height="12"
          rx="2"
        />
        <path d="m16 10 5-3v10l-5-3" />
      </svg>
    );
  }

  if (type === "people") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20c0-4 2.5-6 6-6s6 2 6 6" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M16 14c2.8.3 4.5 2 5 5" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M12 3 20 6v5c0 5.2-3.2 8.7-8 10-4.8-1.3-8-4.8-8-10V6l8-3Z" />
      <path d="m8.5 12 2.2 2.2 4.8-5" />
    </svg>
  );
}

function LearningIllustration() {
  return (
    <div className="relative mx-auto mt-8 w-full max-w-[620px]">
      <div className="absolute bottom-5 left-1/2 h-44 w-[82%] -translate-x-1/2 rounded-full bg-blue-100/70 blur-3xl" />

      <svg
        viewBox="0 0 760 430"
        className="relative w-full"
        fill="none"
        aria-hidden="true"
      >
        {/* background blobs */}
        <path
          d="M0 330c90-80 130-20 200-10 80 12 100-100 194-134 95-35 180 20 222 92 38 66 89 57 144 35v117H0V330Z"
          fill="#DCEBFF"
        />

        {/* plant */}
        <path
          d="M77 350c0-45 3-73 5-96"
          stroke="#72A66B"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M81 283c-24-31-46-27-53-14 9 29 31 38 53 14ZM84 275c5-31 27-43 44-38-3 30-17 43-44 38Z"
          fill="#55C3A1"
        />
        <path
          d="M56 351h48l-9 43H65l-9-43Z"
          fill="#D8E2EE"
        />
        <path
          d="M55 350h50"
          stroke="#90A7BE"
          strokeWidth="3"
        />

        {/* laptop */}
        <rect
          x="170"
          y="132"
          width="370"
          height="228"
          rx="15"
          fill="#BFD2EA"
        />
        <rect
          x="183"
          y="145"
          width="344"
          height="194"
          rx="10"
          fill="#8EB6E8"
        />
        <rect
          x="198"
          y="160"
          width="314"
          height="158"
          rx="8"
          fill="#EEF5FF"
        />

        {/* browser / video UI */}
        <circle cx="215" cy="177" r="4" fill="#B4CBE6" />
        <circle cx="229" cy="177" r="4" fill="#B4CBE6" />
        <circle cx="243" cy="177" r="4" fill="#B4CBE6" />

        <rect
          x="215"
          y="193"
          width="180"
          height="108"
          rx="8"
          fill="#C9E0FA"
        />

        {/* person */}
        <circle
          cx="304"
          cy="229"
          r="26"
          fill="#FFD6BC"
        />
        <path
          d="M278 228c2-22 18-34 27-34 18 0 28 13 28 31-9-9-18-13-29-11-8 2-17 7-26 14Z"
          fill="#243A5A"
        />
        <path
          d="M273 274c8-22 21-32 31-32s24 10 32 32l-8 18h-50l-5-18Z"
          fill="#2563EB"
        />
        <path
          d="M294 252v28M316 252v28"
          stroke="#8BBDF4"
          strokeWidth="7"
          strokeLinecap="round"
        />

        {/* play */}
        <circle
          cx="352"
          cy="276"
          r="19"
          fill="#2563EB"
        />
        <path
          d="m347 267 12 9-12 9v-18Z"
          fill="white"
        />

        {/* right chat panel */}
        <rect
          x="412"
          y="193"
          width="84"
          height="108"
          rx="8"
          fill="white"
        />

        <circle
          cx="433"
          cy="213"
          r="10"
          fill="#DDEAFF"
        />
        <rect
          x="450"
          y="207"
          width="29"
          height="7"
          rx="3.5"
          fill="#C9D9ED"
        />

        <circle
          cx="433"
          cy="242"
          r="10"
          fill="#DDEAFF"
        />
        <rect
          x="450"
          y="236"
          width="35"
          height="7"
          rx="3.5"
          fill="#C9D9ED"
        />

        <circle
          cx="433"
          cy="271"
          r="10"
          fill="#DDEAFF"
        />
        <rect
          x="450"
          y="265"
          width="27"
          height="7"
          rx="3.5"
          fill="#C9D9ED"
        />

        {/* laptop base */}
        <path
          d="M128 359h455l-32 35H163l-35-35Z"
          fill="#8FAED0"
        />
        <rect
          x="289"
          y="371"
          width="135"
          height="7"
          rx="3.5"
          fill="#C8D9EC"
        />

        {/* books */}
        <rect
          x="505"
          y="307"
          width="128"
          height="23"
          rx="5"
          fill="#8AAFE2"
          transform="rotate(7 505 307)"
        />
        <rect
          x="495"
          y="332"
          width="141"
          height="23"
          rx="5"
          fill="#EAF2FF"
          transform="rotate(7 495 332)"
        />
        <rect
          x="491"
          y="357"
          width="138"
          height="23"
          rx="5"
          fill="#5C8ED7"
          transform="rotate(7 491 357)"
        />

        {/* mug */}
        <path
          d="M618 337h50v51h-50v-51Z"
          fill="#2F72DC"
        />
        <path
          d="M668 348h12c14 0 18 23 0 27h-12"
          stroke="#2F72DC"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M628 330c-8-12 8-17 0-30M645 329c-7-11 8-16 0-28"
          stroke="#AFC8E8"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <main className="min-h-[100dvh] w-full overflow-x-hidden bg-[#F7FAFF]">
      <div className="mx-auto grid min-h-[100dvh] w-full max-w-[1500px] lg:grid-cols-[1.05fr_.95fr]">

        {/* LEFT BRANDING */}
        <section className="relative hidden overflow-hidden px-8 py-10 lg:flex xl:px-12">
          <div className="pointer-events-none absolute -left-28 top-[34%] h-[500px] w-[500px] rounded-full bg-blue-100/50 blur-3xl" />
          <div className="pointer-events-none absolute right-[-140px] bottom-[-100px] h-[460px] w-[460px] rounded-full bg-cyan-100/50 blur-3xl" />

          <div className="relative flex w-full flex-col">
            <Link
              href="/"
              className="inline-flex w-fit items-center gap-3"
            >
              <LogoMark />

              <span className="bg-gradient-to-r from-blue-700 to-cyan-500 bg-clip-text text-[34px] font-extrabold tracking-tight text-transparent">
                Study26
              </span>
            </Link>

            <div className="mt-14 max-w-[650px]">
              <p className="text-2xl font-bold tracking-tight text-slate-800 xl:text-[30px]">
                Học trực tuyến dễ dàng
              </p>

              <h2 className="mt-1 bg-gradient-to-r from-blue-700 to-cyan-500 bg-clip-text text-[36px] font-extrabold leading-tight text-transparent xl:text-[42px]">
                Kết nối tri thức, chạm tới tương lai
              </h2>

              <p className="mt-5 max-w-[560px] text-base leading-7 text-slate-500 xl:text-lg">
                Study26 giúp bạn học tập mọi lúc, mọi nơi thông qua các lớp học trực tuyến chất lượng cao.
              </p>
            </div>

            <div className="mt-8 space-y-5">
              <div className="flex items-start gap-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <FeatureIcon type="video" />
                </div>

                <div>
                  <h3 className="font-bold text-slate-800">
                    Học trực tuyến
                  </h3>
                  <p className="mt-1 max-w-[500px] text-sm leading-6 text-slate-500">
                    Tham gia lớp học trực tiếp với giáo viên thông qua video chất lượng cao.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <FeatureIcon type="people" />
                </div>

                <div>
                  <h3 className="font-bold text-slate-800">
                    Tương tác dễ dàng
                  </h3>
                  <p className="mt-1 max-w-[500px] text-sm leading-6 text-slate-500">
                    Trò chuyện, đặt câu hỏi và thảo luận trong thời gian thực.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <FeatureIcon type="shield" />
                </div>

                <div>
                  <h3 className="font-bold text-slate-800">
                    An toàn &amp; Bảo mật
                  </h3>
                  <p className="mt-1 max-w-[500px] text-sm leading-6 text-slate-500">
                    Thông tin cá nhân của bạn luôn được bảo vệ an toàn.
                  </p>
                </div>
              </div>
            </div>

            <LearningIllustration />
          </div>
        </section>

        {/* RIGHT REGISTER */}
        <section className="flex w-full items-center justify-center px-4 py-6 sm:px-6 sm:py-10 lg:px-8 xl:px-12">
          <div className="w-full max-w-[650px]">
            <Link
              href="/"
              className="mb-4 inline-flex items-center text-sm font-medium text-slate-500 transition hover:text-blue-600 lg:hidden"
            >
              ← Về trang chủ
            </Link>

            <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-[0_25px_80px_rgba(37,99,235,0.08)] sm:p-8 md:p-10 lg:p-12">
              <div className="mb-8 text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-8 w-8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="8" r="3" />
                    <path d="M5 20c.7-4.2 3-6.5 7-6.5s6.3 2.3 7 6.5" />
                  </svg>
                </div>

                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-[36px]">
                  Đăng ký tài khoản
                </h1>

                <p className="mx-auto mt-3 max-w-[480px] text-sm leading-6 text-slate-500 sm:text-base">
                  Tạo tài khoản để bắt đầu hành trình học tập cùng Study26
                </p>
              </div>

              <RegisterForm />

              <div className="mt-8 flex items-start gap-3 border-t border-slate-100 pt-6 text-xs leading-5 text-slate-400">
                <svg
                  viewBox="0 0 24 24"
                  className="mt-0.5 h-5 w-5 shrink-0 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <path d="M12 3 20 6v5c0 5.2-3.2 8.7-8 10-4.8-1.3-8-4.8-8-10V6l8-3Z" />
                </svg>

                <p>
                  Bằng cách đăng ký, bạn đồng ý với{" "}
                  <span className="font-semibold text-blue-600">
                    Điều khoản sử dụng
                  </span>{" "}
                  và{" "}
                  <span className="font-semibold text-blue-600">
                    Chính sách bảo mật
                  </span>{" "}
                  của Study26.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
