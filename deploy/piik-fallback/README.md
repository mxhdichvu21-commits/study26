# Study26 Piik fallback — VPS deployment

This is a **separate, self-hosted Piik room site**, not a drop-in LiveKit SFU.
It supports a single video/screen Host and at most 20 Viewers in each room.
Room voice may be interactive; multi-camera conferencing is not supported.

## 1. Prepare an Ubuntu/Linux VPS
- Install Docker Engine and Docker Compose v2, and configure the provider firewall.
- Create DNS A records: `media.study26.site` and `relay.study26.site`
  pointing directly to the VPS public IPv4. Keep the STUN record DNS-only.
- Allow inbound TCP 80/443, UDP 3478, UDP 7882; optionally UDP 3479/3480.
- Don't expose TCP 8787 or the SQLite volume to the internet.

## 2. Start
```sh
cd deploy/piik-fallback
cp .env.example .env
# Edit .env: domains, site password, and optional SFU_PUBLIC_IP.
docker compose pull
docker compose run --rm piik --check-config
docker compose up -d
docker compose ps
curl -fsS https://media.study26.site/healthz
```

Set a unique secret for `SITE_ACCESS_PASSWORD` before startup. For real
production deployments, pin the Piik image to an audited immutable digest.
Back up the `piik-data` volume (SQLite) securely and apply updates carefully.
Caddy renews HTTPS certificates automatically when public DNS and TCP 80/443 work.

## 3. Configure Study26 on Vercel
```text
PIIK_PUBLIC_URL=https://media.study26.site
STUDY26_LIVEKIT_SWITCH_AT_MINUTES=4500
STUDY26_LIVEKIT_BASELINE_MONTH=YYYY-MM
STUDY26_LIVEKIT_BASELINE_MINUTES=<Cloud dashboard participant minutes already used before webhook tracking starts>
```
Deploy the migration `supabase/migrations/202610240001_media_failover.sql`
to the **matching Study26 Supabase project** before deploying Next.js changes.
Keep LiveKit and Supabase keys secret and continue to configure the existing
LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET.

In LiveKit Cloud Settings > Webhooks add:
```text
https://study26.site/api/media/livekit-webhook
```
Use a matching signing API key. Webhook tally is approximate: LiveKit retries
but does not guarantee delivery; the ledger excludes earlier usage until you
supply a manually verified baseline from LiveKit Cloud's dashboard.
The baseline is month-specific; update it at each calendar-month change,
or provide 0 when the receiver was live before any usage that month.
If this is not done, AUTO refuses to pin new rooms instead of guessing.

Go to `/admin/media` to choose the global mode: AUTO / LIVEKIT / PIIK.
AUTO pins **new, unassigned rooms** to Piik when baseline + measured
WebRTC participant minutes reach 4500. The free LiveKit Cloud Build allowance
is 5000 participant minutes, shared among users, not 5000 room minutes.
Other Cloud caps (such as bandwidth) can be reached first: use the admin
manual switch in that case. Existing rooms never migrate mid-call.

## 4. Teacher workflow on backup
1. Teacher opens a Study26 room when Piik has been chosen.
2. Study26 shows the backup panel.
3. Teacher opens the dedicated Piik site, authenticates with its site
   passphrase, and creates a Piik room there.
4. Teacher copies the **Viewer invite** ending in `#v=...`, pastes it
   into the Study26 room panel and saves.
5. Authorized Study26 class members click the Piik invitation in a new tab.
   Piik intentionally blocks iframe embedding, so this is not an in-page
   video experience. The whiteboard and attendance remain in Study26.

**Important security limitation:** Piik Viewer invites are bearer capabilities.
Anyone who obtains the invite URL may join, regardless of their Study26 role.
Share links only inside authenticated Study26 pages; for stronger identity
enforcement, fork Piik to authenticate each Viewer at the signaling boundary
against a short-lived Study26 ticket. This MVP is NOT suitable for classes
requiring strong individual media access control.

Piik and LiveKit have different media protocols. Existing sessions cannot be
migrated seamlessly. AUTO is advisory protection against the usage limit, not
an authoritative LiveKit Cloud quota API. A public VPS and tested DNS are
required: Vercel cannot host Piik's long-running Go/UDP server.
