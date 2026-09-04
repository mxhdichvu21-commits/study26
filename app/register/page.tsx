import Link from "next/link";
import RegisterForm from "@/components/auth/register-form";

function LogoMark() {
  return (
    <div className="study26-logo-icon">
      <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <path d="M12 18 32 10l20 8-20 8-20-8Z" fill="white" />
        <path
          d="M18 24v18c0 3 6 8 14 11 8-3 14-8 14-11V24L32 31 18 24Z"
          fill="white"
        />
        <path d="M32 31v22" stroke="#60A5FA" strokeWidth="3" />
        <circle cx="45" cy="44" r="7" fill="#2563EB" />
        <path d="m43 42 5 3-5 3v-6Z" fill="white" />
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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="6" width="13" height="12" rx="2" />
        <path d="m16 10 5-3v10l-5-3" />
      </svg>
    );
  }

  if (type === "people") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20c0-4 2.5-6 6-6s6 2 6 6" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M16 14c2.8.3 4.5 2 5 5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3 20 6v5c0 5.2-3.2 8.7-8 10-4.8-1.3-8-4.8-8-10V6l8-3Z" />
      <path d="m8.5 12 2.2 2.2 4.8-5" />
    </svg>
  );
}

export default function RegisterPage() {
  return (
    <main className="study26-register-page">
      <div className="study26-register-card">

        {/* LEFT */}
        <section className="study26-register-left">
          <div className="study26-left-inner">

            <Link href="/" className="study26-brand">
              <LogoMark />
              <span>Study26</span>
            </Link>

            <div className="study26-left-content">
              <h1>
                Học trực tuyến dễ dàng
                <br />
                <span>Kết nối tri thức, chạm tới tương lai</span>
              </h1>

              <p>
                Study26 giúp bạn học tập mọi lúc, mọi nơi thông qua các lớp
                học trực tuyến chất lượng cao.
              </p>

              <div className="study26-features">
                <div className="study26-feature">
                  <div className="study26-feature-icon">
                    <FeatureIcon type="video" />
                  </div>
                  <div>
                    <h3>Học trực tuyến</h3>
                    <p>
                      Tham gia lớp học trực tiếp với giáo viên thông qua video
                      chất lượng cao.
                    </p>
                  </div>
                </div>

                <div className="study26-feature">
                  <div className="study26-feature-icon">
                    <FeatureIcon type="people" />
                  </div>
                  <div>
                    <h3>Tương tác dễ dàng</h3>
                    <p>
                      Trò chuyện, đặt câu hỏi và thảo luận trong thời gian thực.
                    </p>
                  </div>
                </div>

                <div className="study26-feature">
                  <div className="study26-feature-icon">
                    <FeatureIcon type="shield" />
                  </div>
                  <div>
                    <h3>An toàn &amp; Bảo mật</h3>
                    <p>
                      Thông tin cá nhân của bạn luôn được bảo vệ an toàn.
                    </p>
                  </div>
                </div>
              </div>

              <div className="study26-illustration">
                <div className="study26-laptop">
                  <div className="study26-laptop-screen">
                    <div className="study26-play">▶</div>
                  </div>
                  <div className="study26-laptop-base" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT */}
        <section className="study26-register-right">
          <div className="study26-form-container">

            <Link href="/" className="study26-mobile-back">
              ← Về trang chủ
            </Link>

            <div className="study26-form-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <circle cx="12" cy="8" r="3" />
                <path d="M5 20c.7-4.2 3-6.5 7-6.5s6.3 2.3 7 6.5" />
              </svg>
            </div>

            <h2 className="study26-form-title">
              Đăng ký tài khoản
            </h2>

            <p className="study26-form-subtitle">
              Nhanh chóng và dễ dàng chỉ trong vài bước
            </p>

            <RegisterForm />

            <div className="study26-privacy">
              Bằng cách đăng ký, bạn đồng ý với{" "}
              <Link href="#">Điều khoản sử dụng</Link>
              {" "}và{" "}
              <Link href="#">Chính sách bảo mật</Link>
              {" "}của Study26.
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
