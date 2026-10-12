# titanfall-arena — Milestone 4
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
One pursuer navigates around obstacles and the living training target using a clearance-tested grid path. It moves at 2.6 meters/second and deals 10 damage within 1.6 meters every 1.2 seconds. Your attack also deals 25 damage to the enemy within 3 meters (75 enemy HP). Player damage flashes red. At zero HP, movement and combat stop; Restart resets player, enemy, target, camera, inputs, health and timers. The defeated enemy stays down until Restart or page reload. Hidden tabs pause the encounter.

### Health pickup (v0.3.1)
The defeated enemy drops one green medical pickup. Walk within 1 meter to restore 25 HP, capped at 100; green feedback shows the actual amount healed. Collection removes it, including at full health. Restart clears the pickup and healing feedback.

## Hunter (v0.4.0)
Q / Cloak activates 6 seconds of invisibility, healing 5 HP/second up to 100. The 15-second cooldown starts on activation. Enemy pursuit and attacks stop while invisible. Space / Attack ends cloak and healing. Hold E / Revive within 2 meters of the blue downed NPC ally for 3 seconds while cloaked. Releasing, damage, attacking, leaving range or cloak expiration clears revival progress; press/hold again to retry. Restart resets cloak, timers, ally and progress. No multiplayer is included.
