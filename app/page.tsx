import Link from "next/link";
import { ArrowRight, BarChart3, CalendarDays, MessageCircle, Video } from "lucide-react";

export default function Home() {
  const features = [
    [Video, "Lớp học trực tuyến", "Học trực tiếp với giảng viên qua video chất lượng cao."],
    [MessageCircle, "Tương tác dễ dàng", "Đặt câu hỏi, thảo luận, chia sẻ tài liệu ngay trong lớp."],
    [CalendarDays, "Lịch học linh hoạt", "Tạo lịch, nhắc nhở tự động và tham gia lớp học đúng giờ."],
    [BarChart3, "Theo dõi tiến độ", "Giảng viên và học viên theo dõi tiến độ học tập rõ ràng."]
  ] as const;

  return (
    <>
      <header className="header">
        <div className="container header-inner">
          <Link className="logo" href="/" aria-label="Study26"><img src="/images/study26-logo.png" alt="Study26"/></Link>
          <nav className="nav"><a className="active" href="#">Trang chủ</a><a href="#features">Giảng viên</a><a href="#features">Cách hoạt động</a><a href="#about">Blog</a><a href="#about">Về chúng tôi</a></nav>
          <div className="actions"><Link className="btn" href="/login">Đăng nhập</Link><Link className="btn primary" href="/register">Đăng ký miễn phí</Link></div>
        </div>
      </header>
      <main>
        <section className="hero"><div className="container hero-grid">
          <div>
            <span className="badge"><span className="dot"/> NỀN TẢNG DẠY HỌC TRỰC TUYẾN</span>
            <h1>Dạy và học trực tuyến<br/>dễ dàng, hiệu quả<br/><span>hoàn toàn miễn phí</span></h1>
            <p>Kết nối giảng viên và học viên mọi lúc, mọi nơi. Học trực tuyến chất lượng cao, tương tác trực tiếp như lớp học thật.</p>
            <div className="actions" style={{marginTop:24}}><Link className="btn primary" href="/register">Đăng ký miễn phí <ArrowRight size={17}/></Link><Link className="btn" href="/login">Đăng nhập</Link></div>
          </div>
          <div className="hero-card"><img className="hero-image" src="/images/hero-demo.png" alt="Minh hoạ lớp học trực tuyến Study26"/><div className="mock-row"><div className="mock"><b>Học viên đang tham gia</b><p>28 học viên</p></div><div className="mock"><b>Trò chuyện</b><p>Chat trực tiếp trong lớp</p></div></div></div>
        </div></section>
        <section id="features" className="features"><div className="container feature-grid">
          {features.map(([Icon,title,desc]) => <div className="feature" key={title}><div className="feature-icon"><Icon size={22}/></div><h3>{title}</h3><p>{desc}</p></div>)}
        </div></section>
        <div id="about" className="container"><div className="cta"><div><h2>Sẵn sàng bắt đầu hành trình học tập?</h2><p>Tham gia Study26 ngay hôm nay và trải nghiệm môi trường học trực tuyến hiện đại.</p></div><Link className="btn primary" href="/register">Đăng ký miễn phí ngay <ArrowRight size={17}/></Link></div></div>
      </main>
    </>
  );
}
