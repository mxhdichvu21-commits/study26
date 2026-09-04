import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function LiveRoomBanner() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: memberships } = await supabase
    .from("class_members")
    .select("class_id")
    .eq("user_id", user.id);

  const classIds =
    memberships?.map((item) => item.class_id) ?? [];

  if (classIds.length === 0) {
    return null;
  }

  const { data: rooms } = await supabase
    .from("rooms")
    .select(`
      id,
      class_id,
      name,
      code,
      status,
      classes (
        id,
        name,
        code
      )
    `)
    .in("class_id", classIds)
    .eq("status", "live")
    .order("started_at", {
      ascending: false,
    });

  if (!rooms || rooms.length === 0) {
    return null;
  }

  return (
    <section className="student-live-section">
      <div className="student-live-heading">
        <div>
          <span className="section-kicker">
            LIVE CLASS
          </span>

          <h2>Lớp học đang diễn ra</h2>

          <p>
            Giáo viên của bạn đang mở lớp trực tuyến.
          </p>
        </div>

        <Link
          href="/student/rooms"
          className="student-live-join-code"
        >
          Nhập mã phòng
        </Link>
      </div>

      <div className="student-live-list">
        {rooms.map((room: any) => {
          const classInfo = Array.isArray(room.classes)
            ? room.classes[0]
            : room.classes;

          return (
            <div
              className="student-live-card"
              key={room.id}
            >
              <div className="student-live-icon">
                ▶
              </div>

              <div className="student-live-info">
                <span className="student-live-status">
                  ● ĐANG TRỰC TUYẾN
                </span>

                <h3>{room.name}</h3>

                <p>
                  {classInfo?.name || "Lớp học"}
                  {classInfo?.code
                    ? ` • ${classInfo.code}`
                    : ""}
                </p>
              </div>

              <Link
                href={`/student/rooms/${room.id}`}
                className="student-live-enter"
              >
                Vào lớp
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
