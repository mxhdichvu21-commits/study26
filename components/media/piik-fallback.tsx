"use client";

import { useCallback, useEffect, useState } from "react";
import Whiteboard from "@/components/teacher/whiteboard";
import AttendanceButton from "@/components/student/attendance-button";

type ResponseData = {
  inviteUrl: string | null;
  piikSite: string | null;
  isTeacher: boolean;
  error?: string;
};

/** Piik runs on its own origin; it cannot be embedded due to its frame policy. */
export default function PiikFallback({ roomId, isTeacher }: {
  roomId: string; isTeacher: boolean;
}) {
  const [data, setData] = useState<ResponseData | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);

  const reload = useCallback(async () => {
    try {
      const response = await fetch(`/api/media/piik-room?roomId=${encodeURIComponent(roomId)}`, {
        cache: "no-store",
      });
      const body = await response.json() as ResponseData;
      if (!response.ok) throw new Error(body.error ?? "Không thể tải phòng Piik");
      setData(body);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tải phòng Piik");
    }
  }, [roomId]);

  useEffect(() => { void reload(); }, [reload]);

  async function saveInvite(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/media/piik-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, inviteUrl: draft.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Không thể lưu lời mời");
      setDraft("");
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể lưu lời mời");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="study26-live-room" style={{ padding: "24px", maxWidth: "1050px", margin: "0 auto" }}>
      <header className="study26-live-header">
        <div className="study26-live-title-wrap">
          <div className="study26-live-logo">S26</div>
          <div className="study26-live-title-group">
            <div className="study26-live-title">Chế độ dự phòng Piik</div>
            <div className="study26-live-subtitle">
              Hạn mức LiveKit đã chạm ngưỡng chuyển đổi • Trình chiếu riêng tư
            </div>
          </div>
        </div>
        {!isTeacher && <AttendanceButton roomId={roomId} />}
      </header>

      <section style={{ padding: "28px", borderRadius: "16px", background: "var(--card, #151c28)" }}>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "12px" }}>
          {isTeacher ? "Thiết lập phòng dự phòng" : "Vào phòng dự phòng của giáo viên"}
        </h2>
        <p>Piik hỗ trợ một người chia sẻ hình ảnh và tối đa 20 người xem.
          Piik sẽ mở ở tab mới; Study26 vẫn quản lý tài khoản, điểm danh và bảng trắng.</p>

        {isTeacher && (
          <div style={{ marginTop: "18px", display: "grid", gap: "12px" }}>
            <p><strong>Bước 1.</strong> Mở máy chủ Piik, tạo phòng và bắt đầu chia sẻ.</p>
            {data?.piikSite ? (
              <a href={data.piikSite} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"
                className="study26-live-whiteboard-btn">Mở máy chủ Piik</a>
            ) : <p style={{ color: "#d97706" }}>Máy chủ chưa được cấu hình. Thiếu PIIK_PUBLIC_URL.</p>}
            <p><strong>Bước 2.</strong> Sao chép đường mời Viewer của Piik và lưu tại đây.</p>
            <form onSubmit={saveInvite} style={{ display: "grid", gap: "10px" }}>
              <input type="url" required value={draft} onChange={e => setDraft(e.target.value)}
                placeholder="https://media.study26.site/r/1234#v=..." autoComplete="off"
                style={{ padding: "12px", borderRadius: "9px", color: "#111" }} />
              <button type="submit" disabled={busy || !data?.piikSite} className="study26-live-whiteboard-btn">
                {busy ? "Đang lưu..." : "Lưu lời mời cho học sinh"}
              </button>
            </form>
            <p><strong>Bước 3.</strong> Học sinh trong lớp mở Study26 để nhận đường mời.</p>
          </div>
        )}

        {data?.inviteUrl ? (
          <div style={{ marginTop: "20px", display: "grid", gap: "12px" }}>
            <p>Phòng Piik đã sẵn sàng.</p>
            <a href={data.inviteUrl} target="_blank" rel="noopener noreferrer"
              referrerPolicy="no-referrer" className="study26-live-whiteboard-btn">
              Mở phòng Piik
            </a>
          </div>
        ) : (
          <p style={{ marginTop: "18px" }}>Chưa có đường mời Piik.
            {isTeacher ? " Hãy tạo phòng và lưu liên kết ở trên." : " Giáo viên chưa khởi tạo phòng dự phòng."}
          </p>
        )}

        <div style={{ marginTop: "20px" }}>
          <button type="button" onClick={() => { setError(""); void reload(); }}
            className="study26-live-whiteboard-btn">Kiểm tra lại lời mời</button>
          <button type="button" onClick={() => setShowWhiteboard(value => !value)}
            className="study26-live-whiteboard-btn" style={{ marginLeft: "10px" }}>
            {showWhiteboard ? "Ẩn bảng trắng" : "Bảng trắng"}
          </button>
        </div>
        {error && <p role="alert" style={{ color: "#ef4444", marginTop: "12px" }}>{error}</p>}
      </section>
      {showWhiteboard && (
        <section style={{ marginTop: "20px", minHeight: "400px" }}>
          <Whiteboard roomId={roomId} canEdit={isTeacher} visible onClose={() => setShowWhiteboard(false)} />
        </section>
      )}
    </main>
  );
}
