# titanfall-arena — Milestone 2
Original sci-fi action RPG training combat prototype. TypeScript, Vite and Three.js.

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
