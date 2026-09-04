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

function TeacherRoomControls({
  roomId,
}: {
  roomId: string;
}) {
  const router = useRouter();
  const room = useRoomContext();

  const [ending, setEnding] = useState(false);

  const leaveRoom = async () => {
    if (ending) return;

    const confirmed = window.confirm(
      "Bạn có chắc muốn rời phòng học không?"
    );

    if (!confirmed) return;

    try {
      setEnding(true);

      try {
        await room.localParticipant.setMicrophoneEnabled(false);
      } catch {}

      try {
        await room.localParticipant.setCameraEnabled(false);
      } catch {}

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
          body: JSON.stringify({
            roomId,
          }),
          keepalive: true,
        });
      } catch (error) {
        console.warn("END ROOM API ERROR:", error);
      }

      router.replace("/teacher");
      router.refresh();
    } catch (error) {
      console.error("LEAVE ROOM ERROR:", error);
      router.replace("/teacher");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={leaveRoom}
        disabled={ending}
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {ending ? "Đang rời..." : "Rời phòng"}
      </button>
    </div>
  );
}

export default function LiveClassroom({
  roomId,
  roomName,
}: LiveClassroomProps) {
  const [token, setToken] = useState<string | null>(null);
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
          body: JSON.stringify({
            roomId,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data?.error || "Không thể lấy token LiveKit."
          );
        }

        if (!cancelled) {
          setToken(data.token);
        }
      } catch (err) {
        console.error(err);

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

    getToken();

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <div className="text-center">
          <div className="mb-3 text-lg font-semibold text-slate-900">
            Đang kết nối phòng học...
          </div>

          <div className="text-sm text-slate-500">
            Vui lòng chờ một chút.
          </div>
        </div>
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="flex min-h-[500px] items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-6">
        <div className="max-w-md text-center">
          <h2 className="mb-2 text-lg font-bold text-red-700">
            Không thể vào phòng học
          </h2>

          <p className="mb-5 text-sm text-red-600">
            {error || "Không có token LiveKit."}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[700px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
      <LiveKitRoom
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
        connect={true}
        audio={false}
        video={false}
        className="flex min-h-[700px] flex-col"
      >
        {/* HEADER - nằm bên trong LiveKitRoom */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3 text-white">
          <div className="min-w-0">
            <div className="truncate text-base font-bold">
              {roomName}
            </div>

            <div className="text-xs text-slate-400">
              Phòng học trực tuyến
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowWhiteboard((v) => !v)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium hover:bg-slate-700"
            >
              {showWhiteboard ? "Ẩn bảng trắng" : "Bảng trắng"}
            </button>

            <TeacherRoomControls roomId={roomId} />
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div
            className={
              showWhiteboard
                ? "min-h-[500px] flex-1"
                : "min-h-[650px] flex-1"
            }
          >
            <VideoConference />
          </div>

          {showWhiteboard && (
            <div className="min-h-[450px] w-full border-t border-slate-800 bg-white lg:w-[42%] lg:border-l lg:border-t-0">
              <Whiteboard
                roomId={roomId}
                canEdit={true}
                visible={true}
                onClose={() => setShowWhiteboard(false)}
              />
            </div>
          )}
        </div>

        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
