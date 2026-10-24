import { createAdminClient } from "@/lib/supabase/admin";

export type MediaProvider = "livekit" | "piik";

function switchThreshold() {
  const value = Number(process.env.STUDY26_LIVEKIT_SWITCH_AT_MINUTES ?? "4500");
  if (!Number.isFinite(value) || value < 0 || value > 5000) {
    throw new Error("STUDY26_LIVEKIT_SWITCH_AT_MINUTES must be 0..5000");
  }
  return value;
}

/**
 * Assign each room one provider once. A mid-lesson migration is impossible:
 * Piik and LiveKit have different room protocols and media topologies.
 * Auto uses a conservative, approximate webhook-based participant-minute tally.
 */
export async function resolveMediaProvider(roomId: string): Promise<MediaProvider> {
  const admin = createAdminClient();
  const { data: room, error: roomError } = await admin
    .from("rooms")
    .select("id, media_provider")
    .eq("id", roomId)
    .single();

  if (roomError || !room) throw new Error("Không thể kiểm tra cấu hình phòng học.");
  if (room.media_provider === "piik" || room.media_provider === "livekit") {
    return room.media_provider;
  }

  const mode = process.env.STUDY26_MEDIA_MODE ?? "livekit";
  let selected: MediaProvider;
  if (mode === "livekit" || mode === "piik") {
    selected = mode;
  } else if (mode === "auto") {
    const { data, error } = await admin.rpc("study26_livekit_minutes_used");
    if (error || data == null) {
      // Never claim the Cloud limit has been measured if our own ledger is unavailable.
      throw new Error("Bộ đếm LiveKit chưa hoạt động. Hãy kiểm tra webhook và migration.");
    }
    selected = Number(data) >= switchThreshold() ? "piik" : "livekit";
  } else {
    throw new Error("STUDY26_MEDIA_MODE không hợp lệ.");
  }

  // Compare-and-set prevents requests racing from changing an already pinned room.
  const { error: updateError } = await admin
    .from("rooms")
    .update({ media_provider: selected })
    .eq("id", roomId)
    .is("media_provider", null);
  if (updateError) throw new Error("Không thể lưu chế độ phòng học.");
  const { data: finalRoom, error: finalError } = await admin
    .from("rooms")
    .select("media_provider")
    .eq("id", roomId)
    .single();
  if (finalError || !finalRoom || !["livekit", "piik"].includes(finalRoom.media_provider)) {
    throw new Error("Chưa thể chọn máy chủ phòng học.");
  }
  return finalRoom.media_provider as MediaProvider;
}
