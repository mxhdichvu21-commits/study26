"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Video } from "lucide-react";

export default function StudentJoinRoomPage() {
  const router = useRouter();

  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleJoinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const code = roomCode.trim().toUpperCase();

    if (!code) {
      setError("Vui lòng nhập mã phòng");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/livekit/join-by-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || "Không thể vào phòng học.");
        setLoading(false);
        return;
      }

      if (!data?.roomId) {
        setError("Phòng học không hợp lệ.");
        setLoading(false);
        return;
      }

      router.push(
        `/student/rooms/${encodeURIComponent(data.roomId)}`
      );
    } catch (error) {
      console.error("STUDENT JOIN ROOM ERROR:", error);
      setError("Không thể kết nối tới máy chủ.");
      setLoading(false);
    }
  }

  return (
    <main className="student-join-page">
      <div className="student-join-card">

        <button
          type="button"
          className="student-join-back"
          onClick={() => router.push("/student")}
        >
          <ArrowLeft size={16} />
          Quay lại
        </button>

        <div className="student-join-logo">
          <Video size={25} />
        </div>

        <h1>Vào phòng học</h1>

        <p>
          Nhập mã phòng do giáo viên cung cấp
        </p>

        <form onSubmit={handleJoinRoom}>
          <label htmlFor="room-code">
            Mã phòng
          </label>

          <input
            id="room-code"
            type="text"
            value={roomCode}
            onChange={(event) => {
              setRoomCode(event.target.value.toUpperCase());

              if (error) {
                setError("");
              }
            }}
            placeholder="Nhập mã phòng"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            disabled={loading}
          />

          {error && (
            <div className="student-join-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="student-join-submit"
            disabled={loading}
          >
            <Video size={17} />
            {loading ? "Đang vào phòng..." : "Vào phòng"}
          </button>
        </form>

        <div className="student-join-help">
          Chưa có mã phòng? Hãy nhận mã từ giáo viên.
        </div>
      </div>
    </main>
  );
}
