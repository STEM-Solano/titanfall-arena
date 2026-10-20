# titanfall-arena — Milestone 9
Original sci-fi action RPG enemy encounter prototype. TypeScript, Vite and Three.js.

## Run locally
Requires Node.js 22.12+ (or 20.19+) and npm.

```sh
npm ci
npm run dev
```
Open the URL printed by Vite. For a phone on the same Wi-Fi, open the computer's LAN IP with Vite's port (normally 5173); allow the port through your local firewall if needed.

```sh
npm run build
npm run preview
```
Production output is `dist/`. Relative asset paths support a future GitHub Pages deployment. GitHub Actions builds and publishes `dist/` on each push to `main`. Play at https://stem-solano.github.io/titanfall-arena/.

## Controls and testing
- WASD or arrow keys: movement. Diagonal speed is capped.
- Touch devices: drag the lower-left joystick; release to stop.
- Space or Attack button: a basic attack within 3 meters, dealing 25 HP with a 0.45-second cooldown. Four hits defeat the stationary target; it respawns after 3 seconds.
- Test misses from outside range, visible hit feedback, the health bar, and simultaneous joystick movement plus Attack.
- Check each arena edge and four obstacles; the character should stop or slide along them.
- Release keys, switch tabs, and return: movement should stop.
- Resize or rotate the screen: rendering and HUD should remain usable.
- Check browser console for errors on desktop and a real mobile device.

## Structure
- `client/`: game, procedural graphics, responsive HUD and input.
- `shared/`: character types, reserved for later shared message contracts.
- `server/`: documentation placeholder only.
- `assets/`: documentation for original procedural assets.

Health is a fixed prototype value; multiplayer, bosses and PvP are outside this milestone. A WebGL-capable browser is required.

## Milestone 4 encounter
One pursuer navigates around obstacles and the living training target using a clearance-tested grid path. It moves at 2.6 meters/second and deals 10 damage within 1.6 meters every 1.2 seconds. Your attack also deals 25 damage to the enemy within 3 meters (75 enemy HP). Player damage flashes red. At zero HP, movement and combat stop; Restart resets player, enemy, target, camera, inputs, health and timers. Defeated enemies stay down; clearing a wave starts the next wave after four seconds. Hidden tabs pause the encounter.

### Health pickup (v0.3.1)
The defeated enemy drops one green medical pickup. Walk within 1 meter to restore 25 HP, capped at 100; green feedback shows the actual amount healed. Collection removes it, including at full health. Restart clears the pickup and healing feedback.

## Hunter (v0.4.0)
Q / Cloak activates 6 seconds of invisibility, healing 5 HP/second up to 100. The 15-second cooldown starts on activation. Enemy pursuit and attacks stop while invisible. Space / Attack ends cloak and healing. Hold E / Revive within 2 meters of the blue downed NPC ally for 3 seconds while cloaked. Releasing, damage, attacking, leaving range or cloak expiration clears revival progress; press/hold again to retry. Restart resets cloak, timers, ally and progress. No multiplayer is included.

## Milestone 5 — v0.5.0
Three waves: (1) Pursuer + Runner, (2) Pursuer + Runner + Armored, (3) Pursuer + two Runners + two Armored. Four seconds between waves; health and Hunter cooldown carry forward. Every defeated enemy drops a 25 HP pickup. Clear wave 3 for Victory; Restart resets enemies, waves, health, pickups, training target, NPC ally and abilities.

| Type | HP | Speed (m/s) | Damage | Attack cooldown |
|---|---:|---:|---:|---:|
| Pursuer (red) | 75 | 2.6 | 10 | 1.2s |
| Runner (purple) | 50 | 4 | 8 | 0.9s |
| Armored (gold) | 150 | 1.6 | 18 | 1.8s |

Original procedural placeholder graphics distinguish the three types. Spawns remain inside the arena, outside obstacle/target collision, at least 8 meters from the player and 3 meters from other living enemies and the ally. If no safe spawn exists, spawning waits.

### Device priorities and unresolved issues
Desktop and iPad landscape are the priority layouts. Real-device iPad verification is still required. iPhone layout remains too cramped for practical play. Mobile double-tap zoom interference and recovering zoom after zooming in remain unresolved; this release preserves the existing touch-action rules and does not claim those issues are fixed.

## Milestone 6 — v0.6.0 progression
Pursuer awards 30 XP, Runner 25 XP, Armored 60 XP. Training target awards none. Level 2 requires 100 XP; level 3 requires another 150 XP; subsequent thresholds increase by 50. All waves total 370 XP, yielding two upgrades. XP overflow carries forward.

Each level pauses gameplay, wave transitions, healing, cooldowns and enemy attacks. Choose with keys 1/2/3, Tab plus Enter/Space, mouse click or touch. Exact current-to-new effects appear before selection: attack +10 damage; maximum health +25 and current health +25; invisibility cooldown −3 seconds, minimum 6 seconds. Cooldown is measured from activation; a cooldown upgrade also caps the currently remaining cooldown at the new duration. Choices stack. Restart resets XP, level and upgrades. No save persists beyond the current run.
Desktop and iPad landscape remain priorities; the iPhone layout and mobile zoom problems documented above remain unresolved.

## Milestone 7 — v0.7.0 run flow
The game opens at a Start Run menu with PC and touch controls. Esc / Pause freezes movement, attacks, healing, enemy AI, wave transitions, cooldowns and the active run clock. Resume preserves the encounter; held input and incomplete revival progress are cleared to avoid unintended actions. Upgrade choices already pause the encounter and must be completed before manual pause. Switching tabs automatically pauses an active encounter.
Victory and defeat show enemies defeated, level reached, chosen upgrades and active run time (excluding menu, pause and upgrades). Play Again fully resets the encounter and starts wave one. Return to Menu resets the encounter and opens the start screen. Mouse, keyboard and touch buttons are supported. Desktop / iPad landscape remain priorities; iPhone layout and zoom limitations remain unresolved.

## Milestone 8 — v0.8.0 ranged combat
Aim with the mouse on desktop, then click the arena or press F to fire. On iPad landscape, drag the right AIM joystick and tap Fire; the left joystick still moves. Space / Attack retains melee combat. The ground line shows aiming direction and flashes on firing. Energy shots travel at 22 m/s for 1.5 seconds, deal current upgraded attack damage, and use a separate 0.45-second cooldown shown in the HUD. Cover and living targets stop projectiles; only the nearest hit takes damage. Segment collision prevents tunneling. Firing ends cloak and revival. Projectiles pause with the encounter and clear on Restart/menu reset. Enemy defeats award XP and pickups; the training target awards none. Existing iPhone layout and zoom issues remain unresolved; desktop and iPad landscape are priorities.

## Milestone 9 — v0.9.0 cooperative multiplayer prototype
Single-player remains at the main page. Use **Co-op Lobby** or `coop.html` for separate server-authoritative cooperative play. Backend code and local simulated tests are provided; **no backend is deployed and two-device online multiplayer is not yet verified**.

See [server/README.md](server/README.md) for exact backend deployment fields, local setup, co-op rules, disconnect behavior, and staged two-player/six-player acceptance checks. The browser client stays on GitHub Pages and accepts a deployed secure backend URL in the lobby, without rebuilding. No multiplayer accounts, bosses or PvP are added. iPhone layout and zoom issues remain unresolved.

Checks: `npm run check`, `npm test`, `npm run build`, `npm run build:server`. Backend: `npm run start:server`. Client: `npm run dev`. Node 22.12+ required.

### v0.9.1 lobby fix
The live backend URL is prefilled. Rejected joins keep the connection open and show the server reason, including expired codes and already-started matches. Correct the code and retry Join Room. Join before host start; after a backend redeploy or host leaving an empty room, create a fresh lobby/code. Client patch remains compatible with protocol 9 / backend v0.9.0.

### v0.9.2 host survival fix
When the host is downed, host control passes to the last living connected teammate in join order. Downed players remain in the room and can be revived; their camera spectates the surviving host. Host disconnect uses the same last-survivor preference. Revival does not steal host control back. If all players are downed, show team defeat while keeping everyone connected; only an explicit host reset returns the team to the lobby. Backend restarts/network failures remain separate disconnect events.

### v0.9.3 connection and movement reliability
Cached navigation replaces repeated per-enemy grid rebuilding/sorting. Co-op rendering buffers 120 ms of authoritative snapshots and does not extrapolate through cover or rewind on late packets. New enemies appear at their real spawn coordinates.
Brief disconnects retain a player slot for 60 seconds and reconnect automatically using a memory-only resume token. Health, XP, room and match state remain on the server; host control passes to connected survivors. The last game view stays visible with a diagnostic connection overlay instead of silently returning to the lobby. A backend restart still loses in-memory rooms; the overlay explains that the room cannot be restored and offers an explicit Return to lobby. Health checks include tick timing diagnostics. These changes do not guarantee real-device latency or hosting uptime; retest with two devices.

### Milestone 10 — v0.10.0 stability testing

Preserves v0.9.3 gameplay and protocol 9. Fixes host fallback choosing an offline member when the host leaves, and restores host control to a connected member when everyone was offline and a non-host reconnects.

Automated coverage: 20 tests, including six actual local WebSocket connections observing server-authoritative movement/aim, melee, projectiles, cloak/healing, teammate revival, pickups, shared XP, all upgrade types, three scaled waves (6/9/15), victory, full-team defeat and host-controlled restart. A seventh join is rejected. Deterministic encounter fixtures and fixed ticks accelerate gameplay; these are simulated results, not six humans playing. Existing single-player and browser-controller regression tests remain enabled.

Reconnect tests retain identity/progress and transfer host on disconnect; test session takeover, acceptance at exactly 60 seconds, rejection after 60 seconds, expiry cleanup and explicit-leave cleanup. An injected backend clock advances reservation time without waiting a minute; production uses Date.now and retains the 60-second limit. Rooms remain in memory and cannot survive a backend restart.

Snapshot latency simulation: 150 ms one-way delivery delay plus deterministic 0–100 ms jitter and ordered packet bursts, rendered every 10 ms. No reverse motion or extrapolation; largest step 0.120 m, longest hold 30 ms. This tests the interpolation buffer, not end-to-end internet input latency, device frame rate or real network packet loss.

Validation commands: `npm test`, `npm run check`, `npm run build`, `npm run build:server`.

Two-device check after deployment:
1. Refresh both devices and confirm v0.10.0. Create/join a fresh co-op room, ready both, and start.
2. Move and fire together; compare enemies, health, cloak healing, pickups, XP and upgrades. One upgrade choice must not pause the other player.
3. Down the host; verify host reassignment without leaving the encounter. Cloak and hold Revive for three seconds.
4. Briefly disable one device's network, then restore it within 60 seconds without refreshing the page; verify same player and progress resume. Repeat with more than 60 seconds and confirm an explicit expired-session message.
5. Clear three waves for victory; restart and confirm XP/upgrades reset. In another run, let both players fall and confirm team defeat and restart.

Real-device v0.10.0 verification is pending. Prior two-device v0.9.3 host transfer, defeat messaging, revival and smoother movement were confirmed by the user. Six physical devices have not been tested. iPhone layout and mobile zoom issues remain unresolved and deferred. No new gameplay features, bosses or PvP.

### Milestone 11 — v0.11.0 optional AI teammates

In the multiplayer lobby, the host can enable **Allow AI teammates**, then click **Ready** to fill empty places up to six total humans and AI. Enabling/changing the toggle resets the host's Ready status; unreadying removes the AI fill. The host must still click **Start Match**. One human plus five AI is supported. AI are named `AI Hunter N`, marked `[AI]` in the roster/party HUD, and colored mint in the arena. Other humans can see the toggle but cannot change it.

Human joins replace AI only in the lobby. During a match, no new players or replacement AI are inserted; disconnected humans retain their original 60-second reservations and resume tokens. AI never become host. When all humans disconnect the simulation freezes; the last human leaving or reservation expiring removes remaining bots and the room. Restart removes AI, resets the run, keeps the toggle preference, and requires human readiness again.

AI decisions run on the existing server without a new service. Bots follow living humans, path around cover, aim/fire or melee, cloak to heal, and prioritize reviving downed teammates while cloaked. They send ordinary movement, action and revival inputs through the same authoritative Room simulation: same 6 m/s movement, collisions, damage, attack ranges/cooldowns, six-second cloak, five HP/s healing, health limits/upgrades, three-second revival and interruption rules. They take enemy damage and can be downed and revived by humans. Bots choose their individual upgrades automatically; human choices remain manual and do not pause the team. Enemy target selection now retains its current valid target unless another is at least 1.5 m closer, preventing constant path resets around a cluster of teammates.

Validation: 29 tests include the previous multiplayer/single-player regression suite, lobby toggle permission/validation, one-human/five-AI and two-human/four-AI teams, six humans replacing all bots, seventh-player rejection, navigation/collisions, damage/cooldowns, cloak/healing, revival in both directions, full-team defeat, autonomous three-wave victory, XP/upgrades/restart, real local WebSocket reconnection without duplicate members, all-human-offline freeze, expiry and room cleanup. Both autonomous mixed teams completed three waves in about 35 seconds of simulated game time with stationary human participants. These are simulation results, not real-device validation. Run `npm test`, `npm run check`, `npm run build`, and `npm run build:server`.

Protocol is now 10: refresh every browser after deployment and create a fresh room. Client and backend version are v0.11.0. iPhone layout and mobile zoom remain pending. No bosses or PvP.

### Milestone 12 — v0.12.0 Nullforge Sentinel and AI balance

Co-op now ends with the original **Nullforge Sentinel**, a stationary sci-fi relay guardian with a shared health bar, after the three existing waves. Wave three alone no longer grants victory. The single-player encounter remains unchanged.

The boss appears safely away from the party, with a three-second arrival delay before its first warning. **Lance** marks a red strip (2.4 m wide) for 1.6 seconds, then deals 24 damage once to occupants. **Pulse** marks a 3.5 m radius orange circle for 1.8 seconds, then deals 18 damage once. Move outside marked zones before impact. Below 50% HP, warnings last 1.25 seconds, the rest between attacks drops from 3 to 2.2 seconds, and Pulse marks two circles. Warnings lock their positions when shown. Cloak hides players from new boss targeting, but does not protect someone standing in an already marked area; impact interrupts revival normally. The HUD shows boss direction/distance when no attack is warning. The boss body blocks movement; ranged shots respect cover, and melee uses the existing 3 m range.

Boss HP = `600 + 300 × (human count − 1) + 100 × AI count`. Counts lock at match start, so disconnects, downed players, host changes, and reservation expiry cannot reduce the boss HP. Examples: 1H/5AI = 1100 HP, 2H/4AI = 1300 HP, 2H/0AI = 900 HP, 6H/0AI = 2100 HP. AI assist only while a human has attacked within the last three seconds; combined AI damage is capped at 35% of maximum boss HP and cannot land the final hit. Humans must deal the majority of damage. Boss defeat awards 200 shared XP and team victory. Restart removes the boss, warnings, shots, pickups and progression, resets all human health, and returns to the existing Ready flow.

Host-only lobby AI strength settings (changing one resets host Ready and removes AI until Ready again):

| Setting | AI damage multiplier | Minimum attack interval | Enemy engagement radius around humans | Follow leash |
| --- | --- | --- | --- | --- |
| Support (default) | 20% | 1.8 s | 6 m | 4 m |
| Balanced | 35% | 1.25 s | 9 m | 6 m |
| Strong | 50% | 0.9 s | 12 m | 8 m |

AI prioritize following, reviving humans, healing, and dodging boss danger zones. They reposition near humans for a clear firing line rather than pursuing enemies across the map. These settings add stricter limits on top of existing movement, collision, cloak, health, attack and revival rules. AI start at the reset host level (level 1) and follow the human host's level/XP throughout the run, including host reassignment. AI never level ahead of humans; their automatic upgrades prioritize health, cloak, then damage. Enemy kills by any teammate award the full enemy XP to every human member, including downed players and disconnected players whose 60-second reservation still exists. AI display the host's progression. Training targets award no XP.

Validation: 38 automated tests include full encounters with ordinary simulated player inputs for 1H/5AI, 2H/4AI, 2H/0AI and 6H/0AI; boss spawning, locked scaling, warning geometry/dodging, both phases, damage and projectile cover, AI strength/cadence/progression/XP, AI boss damage ceiling, revival during the boss, defeat, victory and restart. Real local WebSocket tests verify identical boss health/phase/zones across clients and persistence through host transfer/reconnect. Browser-controller tests cover strength selection and boss health/warning HUD. Tests use accelerated simulation and some explicit fixtures; they are separate from real-device verification. Existing single-player, controls, multiplayer capacity, reconnect expiry, upgrade pause isolation and movement-buffer regressions remain enabled.

Client/backend version v0.12.0, protocol 11. Refresh every browser and create a fresh room after deployment. Real-device boss readability, dodge timing and AI feel need player feedback. iPhone layout and zoom remain unresolved and deferred. No PvP.

### v0.12.1 — boss available in single-player

Single-player now continues after wave three into the **Nullforge Sentinel** fight, with 600 HP for one Hunter. No multiplayer room, AI teammates, or backend connection is needed. It uses the same locked lance/pulse warnings and second phase below 50% HP as co-op, plus a boss health bar and direction/distance hint. The boss body blocks movement, and both melee and cover-respecting projectiles can damage it. Victory requires the boss kill. Pause and level-up choices freeze boss timers; impact damage interrupts NPC revival. Restart/Play Again and Return to Menu clear boss state and danger zones along with the rest of the encounter.

The boss awards 200 XP; final level/XP are recorded without opening another upgrade choice over the victory screen. The single-player regression harness now verifies wave-three transition without premature victory, 600 HP, pause, pulse damage/dodging, projectile damage, phase two, melee victory, restart cleanup and existing NPC revival. All 38 tests, TypeScript and both production builds are required. Client/backend version v0.12.1; protocol remains 11. Co-op balance and boss behavior are unchanged. Real-device single-player boss testing is pending. iPhone layout and zoom remain unresolved.
