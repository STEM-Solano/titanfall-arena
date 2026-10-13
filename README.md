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
