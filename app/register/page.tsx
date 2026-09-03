import Link from "next/link";

export default function Register() {
  return <main className="auth-page">
    <section className="auth-left"><div><Link className="logo" href="/" aria-label="Study26"><img src="/images/study26-logo.png" alt="Study26"/></Link><div style={{marginTop:90}}><h1>Bắt đầu học tập <span style={{color:"var(--blue)"}}>cùng Study26</span></h1><p>Tạo tài khoản miễn phí và tham gia các lớp học trực tuyến.</p></div></div><div className="auth-art">📚</div></section>
    <section className="auth-right"><div className="auth-box">
      <div style={{textAlign:"right",marginBottom:50,color:"#7b879b"}}>Đã có tài khoản? <Link className="link" href="/login">Đăng nhập</Link></div>
      <h2>Đăng ký</h2><p>Tạo tài khoản Study26 trong vài bước đơn giản.</p>
      <form className="form" action="/student">
        <div className="field"><label>Họ và tên</label><input required placeholder="Nguyễn Văn An"/></div>
        <div className="field"><label>Email</label><input required type="email" placeholder="you@example.com"/></div>
        <div className="field"><label>Mật khẩu</label><input required type="password" placeholder="Tối thiểu 8 ký tự"/></div>
        <div className="field"><label>Loại tài khoản</label><select><option>Học sinh</option><option>Giáo viên</option></select></div>
        <button className="btn primary" style={{height:54}}>Tạo tài khoản</button>
      </form>
    </div></section>
  </main>;
}
