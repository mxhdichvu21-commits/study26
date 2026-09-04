"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useRoomContext,
} from "@livekit/components-react";
import { useRouter } from "next/navigation";
import AttendanceButton from "@/components/student/attendance-button";
import Whiteboard from "@/components/teacher/whiteboard";

type Props = {
  roomId: string;
  roomTitle: string;
};

function StudentRoomControls({
  roomId,
}: {
  roomId: string;
}) {
  const router = useRouter();
  const room = useRoomContext();

  const [leaving, setLeaving] = useState(false);

  async function leaveRoom() {
    if (leaving) return;

    setLeaving(true);

    try {
      // 1. Ghi nhận học sinh rời phòng.
      await fetch("/api/livekit/leave", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomId,
        }),
        keepalive: true,
      });
    } catch {
      // Không chặn việc rời phòng nếu API mạng gặp lỗi.
    }

    try {
      // 2. Đóng LiveKit một cách chủ động.
      await room.disconnect();
    } catch {
      // Bỏ qua lỗi đóng kết nối khi rời phòng.
    }

    // 3. Chỉ chuyển trang sau khi đã disconnect.
    router.replace("/student");
    router.refresh();
  }

  return (
    <button
      type="button"
      className="live-leave-button"
      onClick={leaveRoom}
      disabled={leaving}
    >
      {leaving ? "Đang rời lớp..." : "Rời lớp"}
    </button>
  );
}

export default function StudentLiveClassroom({
  roomId,
  roomTitle,
}: Props) {
  const router = useRouter();

  const [token, setToken] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [whiteboardOpen, setWhiteboardOpen] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    async function joinRoom() {
      try {
        const response = await fetch("/api/livekit/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ roomId }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Không thể vào phòng học."
          );
        }

        if (!cancelled) {
          setToken(data.token);
          setServerUrl(data.serverUrl);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Không thể kết nối phòng học."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void joinRoom();

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  if (loading) {
    return (
      <div className="live-loading">
        <div className="live-spinner" />

        <h2>Đang vào lớp học...</h2>

        <p>
          Study26 đang kết nối bạn với phòng học trực tuyến.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="live-error">
        <div className="live-error-icon">!</div>

        <h2>Không thể vào lớp</h2>

        <p>{error}</p>

        <button
          type="button"
          className="live-back-button"
          onClick={() => router.push("/student")}
        >
          ← Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="live-classroom">
      <header className="live-header">
        <div className="live-header-left">
          <div className="live-brand-mark">
            S26
          </div>

          <div>
            <div className="live-title">
              {roomTitle}
            </div>

            <div className="live-subtitle">
              Study26 • Lớp học trực tuyến
            </div>
          </div>

          <span className="live-badge">
            ● ĐANG HỌC
          </span>
        </div>

        <div className="live-header-right">
          <AttendanceButton roomId={roomId} />

          <button
            type="button"
            className={`live-whiteboard-button ${
              whiteboardOpen ? "active" : ""
            }`}
            onClick={() =>
              setWhiteboardOpen((value) => !value)
            }
          >
            ✎ Bảng trắng
          </button>
        </div>
      </header>

      <div
        className={`live-stage ${
          whiteboardOpen
            ? "with-whiteboard"
            : ""
        }`}
      >
        <div className="live-video-stage">
          <LiveKitRoom
            token={token}
            serverUrl={serverUrl}
            connect={true}
            audio={false}
            video={false}
            data-lk-theme="default"
            style={{
              height: "100%",
            }}
          >
            <VideoConference />
            <RoomAudioRenderer />

            <div className="student-live-floating-controls">
              <StudentRoomControls
                roomId={roomId}
              />
            </div>
          </LiveKitRoom>
        </div>

        {whiteboardOpen && (
          <div className="live-whiteboard-stage">
            <Whiteboard
              roomId={roomId}
              canEdit={false}
              visible={whiteboardOpen}
              onClose={() =>
                setWhiteboardOpen(false)
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
