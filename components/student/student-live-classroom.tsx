"use client";

import "@livekit/components-styles";

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

function StudentRoomControls({ roomId }: { roomId: string }) {
  const router = useRouter();
  const room = useRoomContext();
  const [leaving, setLeaving] = useState(false);

  async function leaveRoom() {
    if (leaving) return;

    setLeaving(true);

    try {
      await fetch("/api/livekit/leave", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roomId }),
        keepalive: true,
      });
    } catch {
      // Không chặn việc rời phòng nếu API gặp lỗi.
    }

    try {
      await room.disconnect();
    } catch {
      // Bỏ qua lỗi disconnect.
    }

    router.replace("/student");
    router.refresh();
  }

  return (
    <button
      type="button"
      className="study26-live-leave"
      onClick={leaveRoom}
      disabled={leaving}
    >
      {leaving ? "Đang rời..." : "Rời lớp"}
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
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function joinRoom() {
      try {
        setLoading(true);
        setError("");

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
            data?.error || "Không thể vào phòng học."
          );
        }

        if (!data.token || !data.serverUrl) {
          throw new Error(
            "LiveKit chưa trả về token hoặc server URL."
          );
        }

        if (!cancelled) {
          setToken(data.token);
          setServerUrl(data.serverUrl);
        }
      } catch (err) {
        console.error("LIVEKIT JOIN ERROR:", err);

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

  if (error || !token || !serverUrl) {
    return (
      <div className="live-error">
        <div className="live-error-icon">!</div>

        <h2>Không thể vào lớp</h2>

        <p>{error || "Không có token LiveKit."}</p>

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
    <div className="study26-live-room">
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect
        audio={false}
        video={false}
        data-lk-theme="default"
        className="study26-livekit-room"
      >
        <header className="study26-live-header">
          <div className="study26-live-title-wrap">
            <div className="study26-live-logo">S26</div>

            <div className="study26-live-title-group">
              <div className="study26-live-title">
                {roomTitle}
              </div>

              <div className="study26-live-subtitle">
                Study26 • Lớp học trực tuyến
              </div>
            </div>
          </div>

          <div className="study26-live-header-actions">
            <AttendanceButton roomId={roomId} />

            <button
              type="button"
              className={`study26-live-whiteboard-btn ${
                whiteboardOpen ? "active" : ""
              }`}
              onClick={() =>
                setWhiteboardOpen((value) => !value)
              }
            >
              {whiteboardOpen
                ? "Ẩn bảng trắng"
                : "Bảng trắng"}
            </button>
          </div>
        </header>

        <main className="study26-live-content">
          <div
            className={
              whiteboardOpen
                ? "study26-live-video-wrap study26-live-split"
                : "study26-live-video-wrap"
            }
          >
            <section className="study26-live-video">
              <VideoConference />

              <div className="study26-student-leave">
                <StudentRoomControls roomId={roomId} />
              </div>
            </section>

            {whiteboardOpen && (
              <aside className="study26-live-whiteboard">
                <Whiteboard
                  roomId={roomId}
                  canEdit={false}
                  visible
                  onClose={() =>
                    setWhiteboardOpen(false)
                  }
                />
              </aside>
            )}
          </div>
        </main>

        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
