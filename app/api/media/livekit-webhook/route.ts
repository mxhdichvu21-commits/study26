import { NextResponse } from "next/server";
import { WebhookReceiver } from "livekit-server-sdk";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const key = process.env.LIVEKIT_API_KEY;
  const secret = process.env.LIVEKIT_API_SECRET;
  if (!key || !secret) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const raw = await request.text();
  const authorization = request.headers.get("authorization") ?? "";
  try {
    const receiver = new WebhookReceiver(key, secret);
    const event = await receiver.receive(raw, authorization);
    if (event.event !== "participant_joined" && event.event !== "participant_left") {
      return NextResponse.json({ ok: true });
    }
    const roomSid = event.room?.sid;
    const participantSid = event.participant?.sid;
    if (!roomSid || !participantSid || !event.createdAt) {
      return NextResponse.json({ error: "Incomplete event" }, { status: 400 });
    }
    const occurredAt = new Date(Number(event.createdAt) * 1000);
    if (!Number.isFinite(occurredAt.getTime())) {
      return NextResponse.json({ error: "Invalid timestamp" }, { status: 400 });
    }
    const admin = createAdminClient();
    const { error } = await admin.rpc("study26_record_livekit_event", {
      p_room_sid: roomSid,
      p_participant_sid: participantSid,
      p_event: event.event,
      p_at: occurredAt.toISOString(),
    });
    if (error) {
      console.error("LIVEKIT WEBHOOK DATABASE ERROR", error);
      return NextResponse.json({ error: "Unable to save event" }, { status: 503 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    // Never accept events with invalid LiveKit signatures.
    return NextResponse.json({ error: "Invalid webhook" }, { status: 401 });
  }
}
