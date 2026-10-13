# Milestone 9 cooperative backend — v0.9.0

Status: prepared and tested locally with simulated WebSocket clients. **Not deployed, and not yet verified with two separate physical devices.** The browser client remains on GitHub Pages. Single-player remains a separate, unchanged simulation.

## Local setup

Node 22.12+ and npm are required. From the repository root:

```sh
npm ci
npm run check
npm test
npm run build
npm run build:server
npm run start:server
```

In another terminal run `npm run dev`. Open `http://localhost:5173/coop.html` in two browser sessions. Enter `http://localhost:3001` as the backend URL. Create a room, copy its code, join from session two, mark both Ready, and have the host Start Match. This is a local simulated/session test, not proof of separate-device online multiplayer.

For LAN testing use the computer's LAN IP in both client and backend URLs and add the client origin to `ALLOWED_ORIGINS` (example `http://192.168.1.10:5173`). Allow ports 3001 and 5173 in the local firewall if needed. GitHub Pages uses HTTPS and requires WSS; it cannot use an insecure LAN backend.

## Hosting setup needed (Render example)

A separate **Node Web Service**, not another static site, is required. Render supports WebSockets and TLS. No Render account or deployment was accessed or created by this implementation.

1. Create/sign in to your own Render account at https://dashboard.render.com/. Accept its terms yourself if required.
2. New → Web Service. Connect GitHub and authorize access to `STEM-Solano/titanfall-arena`. Select that repository and branch `main`.
3. Set the following fields:

| Field | Value |
|---|---|
| Name | `titanfall-arena-coop` (or an available name) |
| Runtime | Node |
| Root directory | Leave blank (repository root) |
| Build command | `npm ci --include=dev && npm run check && npm test && npm run build:server` |
| Start command | `npm run start:server` |
| Health check path | `/health` |
| Instances | One |
| Plan | Free for prototype testing, if offered |
| Environment variable | `ALLOWED_ORIGINS=https://stem-solano.github.io` |
| Node version | 22.12+; `.node-version` is provided |

4. Do not select a paid plan or authorize charges unless you decide to do so. Render advertises a Free web service tier; account verification or payment requirements can vary. If signup demands a card or a paid plan, stop and review those terms/costs before proceeding. No payment is authorized or necessary in the code.
5. Create/deploy the service. Wait for the deploy to succeed. Open its actual HTTPS URL plus `/health`; it should return `ok: true`, `version: "0.9.0"` and `protocol: 9`.
6. Open https://stem-solano.github.io/titanfall-arena/coop.html on **both devices**. Paste the same actual Render HTTPS service URL into Backend URL. The client converts it to WSS `/ws`; no rebuild is needed. Create/join the same room and perform the two-player checks below.

An optional `render.yaml` is provided for a Blueprint using the same Free prototype configuration. It is only a prepared manifest; nothing has been deployed. A Dockerfile is also provided for another single-instance Node/WebSocket host.

Free Render services can spin down after 15 minutes idle and wake slowly. Redeploys/restarts/spin-down lose all in-memory rooms; clients show disconnect and must create or join a new lobby. Active traffic, usage limits, restarts and billing follow Render's policies. Do not scale this prototype to multiple instances: room state is in memory, with no shared room store. Hosting URLs and fees must be verified at setup time.

Official sources: https://render.com/docs/websocket, https://render.com/docs/deploy-node-express-app, https://render.com/docs/free.

## Cooperative rules and authority

- Protocol 9. Six-character random room codes. Maximum six players; host start requires at least two, all Ready. Joining during an active match is rejected.
- Server runs at 20 fixed ticks/second and broadcasts snapshots. Clients send only movement/aim inputs, ability/attack requests, ready/start and upgrade choices. Client-supplied health, position teleport, XP, outcomes or damage are never trusted. Numeric input is validated, clamped and stale input neutralized after 0.5 seconds. Payload/rate limits and WebSocket heartbeat are included.
- No PvP or friendly fire. All attacks/projectiles, collisions, cloak, 5 HP/s healing, cooldowns, damage, pickups, revivals, enemy AI and wave results are server-calculated.
- Downed players stop moving/attacking and cannot heal themselves. There is no bleed-out timer in this milestone. A living Hunter must cloak, stay within 2 meters and hold Revive for 3 seconds to restore a teammate to 50% of maximum HP. Damage, attacks, release, leaving range or cloak expiration cancel progress. The training NPC can also be revived.
- Enemy kills give shared XP to connected teammates, including downed teammates. Each chooses upgrades independently. Choosing a pending upgrade stops that player's movement/attacks, but **does not pause the server, other players, enemies or timers**. The choosing player remains vulnerable. A maximum-health upgrade does not revive a downed player.
- Every defeated enemy drops a 25 HP pickup. The first living player in range collects it; one pickup cannot heal multiple players. HP is capped at upgraded max health. Training target awards no XP and respawns only into clear space.
- Three waves retain the enemy types. Two players get 2/3/5 enemies; parties of 3–4 get 4/6/10; parties of 5–6 get 6/9/15. The party size at match start determines wave count. Victory requires wave 3 clear; all connected players downed causes defeat.
- Host disconnect transfers host role to the next connected player. During a match, disconnected players/projectiles are removed; survivors continue. No seamless reconnect or saved run. Rooms disappear when everyone leaves or the backend restarts.
- Host can return a finished team to the lobby for a clean reset; everyone must ready again. No shared pause is available in co-op. Single-player pause remains unchanged.

## Test stages and acceptance checklist

### Stage 1: simulated clients — completed locally

`npm test` includes actual WebSocket connections with two and six simulated clients, lobby and host gates, seventh-player rejection, room isolation, malformed/action validation, authoritative state, disconnects, single-player regression, deterministic combat/cover, cloak/healing, revival, XP/upgrades, pickups, waves, victory/defeat and resets. Passing simulation does not establish internet hosting or real-device UX.

### Stage 2: two real players — required after backend deployment

1. On two separate desktop/iPad devices, open the Pages co-op URL and enter the same deployed backend URL. Use different names. Player A creates a room; Player B joins its code.
2. Confirm both see the same two names and ready flags. Confirm B cannot host-start; A can start only after both are ready.
3. Move and aim simultaneously. Confirm both see each other's actions, projectile hits, cloak transparency, damage and healing.
4. Down B by letting enemies attack; A cloaks nearby and holds Revive for 3 seconds. Check completion at 50% HP. Try release, attack, leaving range and cloak expiry to confirm interruption.
5. Collect one pickup and confirm it disappears on both screens but heals only the collector. Attack training target and confirm no XP. Defeat enemies and verify shared XP and individually applied upgrades while the other device keeps moving.
6. Clear three waves and confirm both get Victory. Have the host return to lobby and verify all progression/health/pickups reset. Also test all-down defeat.
7. Close a player tab during the match. Confirm disconnect notice/host transfer and survivor behavior. Stop/restart the backend and confirm a clear lost-connection message rather than a false victory or automatic single-player fallback.
8. Record device/browser, latency feel, errors and results. Do not mark online co-op verified until these pass on two separate devices.

### Stage 3: six real players — after stage 2 passes

Repeat the same checklist with six separate sessions/devices; reject a seventh join; confirm all Ready before host start. Exercise multiple simultaneous shots, independent upgrades and competing pickup collection, at least two downed players, disconnect of host, and the 6/9/15 enemy waves. Watch server CPU, snapshot latency and memory on the selected hosting plan. The limit is implemented and simulated, but six-device performance remains unverified.

## Current limits

No authentication or persistent accounts; room codes are invitation identifiers, not passwords. This is a bounded prototype with in-memory state, one instance, no mid-match join/resume and no matchmaking. Client interpolation is cosmetic; no prediction/lag compensation yet. Real-device input, iPad landscape layout and internet latency require testing. iPhone layout and mobile zoom issues remain unresolved and are set aside. No bosses or PvP added.
