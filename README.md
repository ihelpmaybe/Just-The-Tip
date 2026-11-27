# Just The Tip

**v2.0.29** — local **PulseChain** tip-to-buzz for streamers.

Watch a tip wallet (and optional PulseX pools). When a tip lands, buzz linked toys. Tip QRs encode amount + coin (EIP-681).

**No accounts. No private keys. PulseChain only.** Bound to `127.0.0.1`.

**Showcase (look only):** https://ihelpmaybe.github.io/Just-The-Tip/  
**Hub:** [ihelpmaybe.github.io](https://ihelpmaybe.github.io/) · **Source:** this repo  
GitHub Pages is a peek — tip-to-buzz runs on your PC only.

Requires **Node 20+** for source builds. Operators can skip Node and use the Windows installer (`npm run dist:win`).

---

## Run from source

```bash
npm install
npm run stop    # free leftovers, if any
npm run dev
```

Open `http://127.0.0.1:5193/` in **Chrome or Edge**.

| Command | What |
|--------|------|
| `npm run dev` | Vite UI + API on **5193** |
| `npm run stop` | Kill local Just The Tip processes |
| `npm start` | Production build + Node host on **5193** |
| `npm run desktop` | Build + run Electron shell |
| `npm run dist:win` | Windows installer → `release/JustTheTip-Setup-*.exe` |
| `npm run verify:release` | Automated release gate |

Shared tip math / watcher: [`shared/`](shared/) (`@pulsefans/domain` — legacy package name).

---

## First run (operators)

1. Open the app (installer or `npm run desktop` / `npm run dev`)
2. Footer should show **v2.0.29**
3. Paste tip wallet on **Home** → Save
4. Connect a toy (Lovense Connect, Bluetooth, or Intiface)
5. Header **Start watching**
6. Optional: OBS Browser Sources → `/overlay` (tip pop-up) and `/overlay/qr` (QR carousel)

Practice mode logs real tips without motors. Turn it **off** before a live stream.

Full gate + live checklist: [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md)

---

## Pages

| Menu | What |
|------|------|
| **Home** | Tip wallet + toy connect |
| **Tip menu** | Coins, patterns, USD scale, share/export |
| **Stream alerts** | OBS tip pop-up + QR carousel |
| **Go live** | Wallet + pool feeds (Start watching is in the header) |
| **Settings** | Saved wallets, RPC, look, buzz timing, backup |

---

## What it does

- **Watch** a PulseChain address for native PLS and whitelisted ERC/PRC-20 tips (public RPC).
- **Tip menu** — coin whitelist, patterns per toy, fan-facing EIP-681 QRs.
- **Buzz** linked toys (vibe, rotate, air/pump, thrust as the pattern fits).
- **Practice mode** — real tips log without motors.
- **OBS** — `/overlay` tip pop-up, optional `/overlay/qr` carousel.
- **Export** tip menu HTML/JPG from Tip menu → Share.

---

## Devices

| Path | What |
|------|------|
| **Lovense Connect** | Default. Same Wi‑Fi; LAN via `POST /api/lovense` |
| **Bluetooth** | Direct Lovense Web Bluetooth in Chrome/Edge / Electron |
| **Intiface** | Optional multi-brand (`ws://127.0.0.1:12345`) |

---

## Safety

- Public PulseChain RPC reads only — never a seed or private key.
- Bound to **127.0.0.1** — not a public multi-tenant server.
- Lovense Connect goes through the local Node bridge, not the browser directly.

---

## Verify before you stream

```bash
npm run verify:release
```

That covers typecheck, ladder / wallets / EIP-681 / pools / overlay, production build, and Playwright smoke. It does **not** replace a real toy + real tip pass.

Fake Lovense Connect (optional): [lovense-emu](https://github.com/ihelpmaybe/lovense-emu) — see [`docs/lovense-emulator.md`](docs/lovense-emulator.md).

---

## License

MIT — see [LICENSE](LICENSE).
