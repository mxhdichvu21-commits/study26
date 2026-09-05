"use client";

import "@livekit/components-styles";

import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useRoomContext,
} from "@livekit/components-react";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import Whiteboard from "./whiteboard";

type LiveClassroomProps = {
  roomId: string;
  roomName: string;
};

function TeacherRoomControls({ roomId }: { roomId: string }) {
  const router = useRouter();
  const room = useRoomContext();

  const [leaving, setLeaving] = useState(false);
  const [ending, setEnding] = useState(false);

  async function leaveRoom() {
    if (leaving || ending) return;

    setLeaving(true);

    try {
      try {
        await fetch("/api/livekit/leave", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ roomId }),
          keepalive: true,
        });
      } catch (error) {
        console.warn("LEAVE ROOM API ERROR:", error);
      }

      try {
        await room.disconnect();
      } catch (error) {
        console.warn("LIVEKIT DISCONNECT ERROR:", error);
      }
    } finally {
      router.replace("/teacher");
      router.refresh();
    }
  }

  async function endRoom() {
    if (leaving || ending) return;

    const confirmed = window.confirm(
      "Bạn có chắc muốn kết thúc lớp học không? Tất cả học sinh trong phòng sẽ bị ngắt kết nối."
    );

    if (!confirmed) return;

    setEnding(true);

    try {
      try {
        await room.disconnect();
      } catch (error) {
        console.warn("LIVEKIT DISCONNECT ERROR:", error);
      }

      try {
        await fetch("/api/livekit/end", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ roomId }),
          keepalive: true,
        });
      } catch (error) {
        console.warn("END ROOM API ERROR:", error);
      }
    } finally {
      router.replace("/teacher");
      router.refresh();
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <button
        type="button"
        onClick={leaveRoom}
        disabled={leaving || ending}
        className="study26-live-leave"
      >
        {leaving ? "Đang rời..." : "Rời phòng"}
      </button>

      <button
        type="button"
        onClick={endRoom}
        disabled={leaving || ending}
        className="study26-live-leave"
        style={{
          background: "#dc2626",
        }}
      >
        {ending ? "Đang kết thúc..." : "Kết thúc lớp"}
      </button>
    </div>
  );
}

export default function LiveClassroom({
  roomId,
  roomName,
}: LiveClassroomProps) {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWhiteboard, setShowWhiteboard] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function getToken() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/livekit/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ roomId }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data?.error || "Không thể lấy token LiveKit."
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
        console.error("LIVEKIT TOKEN ERROR:", err);

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

    void getToken();

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  if (loading) {
    return (
      <div className="live-loading">
        <div className="live-spinner" />
        <h2>Đang kết nối phòng học...</h2>
        <p>Vui lòng chờ một chút.</p>
      </div>
    );
  }

  if (error || !token || !serverUrl) {
    return (
      <div className="live-error">
        <div className="live-error-icon">!</div>

        <h2>Không thể vào phòng học</h2>

        <p>{error || "Không có token LiveKit."}</p>

        <button
          type="button"
          className="live-back-button"
          onClick={() => window.location.reload()}
        >
          Thử lại
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
                {roomName}
              </div>

              <div className="study26-live-subtitle">
                Study26 • Lớp học trực tuyến
              </div>
            </div>
          </div>

          <div className="study26-live-header-actions">
            <button
              type="button"
              className="study26-live-whiteboard-btn"
              onClick={() =>
                setShowWhiteboard((value) => !value)
              }
            >
              {showWhiteboard
                ? "Ẩn bảng trắng"
                : "Bảng trắng"}
            </button>

            <TeacherRoomControls roomId={roomId} />
          </div>
        </header>

        <main className="study26-live-content">
          <div
            className={
              showWhiteboard
                ? "study26-live-video-wrap study26-live-split"
                : "study26-live-video-wrap"
            }
          >
            <section className="study26-live-video">
              <VideoConference />
            </section>

            {showWhiteboard && (
              <aside className="study26-live-whiteboard">
                <Whiteboard
                  roomId={roomId}
                  canEdit
                  visible
                  onClose={() => setShowWhiteboard(false)}
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
