# Wave Tunnel Next.js

A mobile-friendly Next.js + raw Three.js wave tunnel.

## Includes

- Colorful wave JPG texture in `public/wave-dotted-texture-seamless.jpg`
- Procedural transparent grid texture
- Small square/rectangle nodes baked directly into the grid texture
- Vortex center with dark hole and glowing rings
- App Router structure

## Run

```bash
npm install
npm run dev
```

Then open:

```txt
http://localhost:3000
```

## Main files

```txt
components/WaveTunnel.jsx
app/page.jsx
app/globals.css
public/wave-dotted-texture-seamless.jpg
```

## Quick tweaks

In `components/WaveTunnel.jsx`:

- Grid opacity: `gridMaterial.opacity`
- Wave opacity: `bgMaterial.opacity`
- Square node opacity: `drawNode(..., big ? 0.95 : 0.72, ...)`
- Node glow: `ctx.shadowBlur = s * 2.5`
- Texture movement speed: `gridTexture.offset.y = -time * 0.2`
