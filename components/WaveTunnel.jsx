"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

function makeGridCanvasTexture() {
  const size = 2048;
  const canvas = document.createElement("canvas");

  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, size, size);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  function drawNode(x, y, s, alpha, tint) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = tint;
    ctx.shadowColor = tint;
    ctx.shadowBlur = s * 2.5;
    ctx.fillRect(x - s * 0.5, y - s * 0.5, s, s);
    ctx.restore();
  }

  function drawCurve(points, color, width, nodeEvery, nodeSize) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.shadowColor = color;
    ctx.shadowBlur = width * 2.2;
    ctx.beginPath();

    for (let i = 0; i < points.length; i += 1) {
      const p = points[i];

      if (i === 0) {
        ctx.moveTo(p.x, p.y);
      } else {
        ctx.lineTo(p.x, p.y);
      }
    }

    ctx.stroke();

    for (let i = 0; i < points.length; i += nodeEvery) {
      const p = points[i];
      const big = i % (nodeEvery * 6) === 0;

      drawNode(
        p.x,
        p.y,
        big ? nodeSize * 1.85 : nodeSize,
        big ? 0.95 : 0.72,
        i % 2 === 0 ? "rgba(255,255,255,1)" : "rgba(255,190,255,1)"
      );
    }

    ctx.restore();
  }

  // Horizontal wavy grid lines with square nodes baked onto the texture.
  for (let row = -2; row <= 22; row += 1) {
    const yBase = row * 98;
    const points = [];

    for (let x = -120; x <= size + 120; x += 14) {
      const u = x / size;

      const y =
        yBase +
        Math.sin(u * Math.PI * 2 * 2.0 + row * 0.75) * 28 +
        Math.sin(u * Math.PI * 2 * 5.0 + row * 0.31) * 10;

      points.push({ x, y });
    }

    const color =
      row % 3 === 0
        ? "rgba(255,180,255,0.72)"
        : row % 3 === 1
          ? "rgba(180,245,255,0.72)"
          : "rgba(255,255,255,0.64)";

    drawCurve(points, color, row % 5 === 0 ? 2.2 : 1.45, 5, 9);
  }

  // Vertical wavy connection lines with square nodes.
  for (let col = -2; col <= 18; col += 1) {
    const xBase = col * 132;
    const points = [];

    for (let y = -140; y <= size + 140; y += 16) {
      const v = y / size;

      const x =
        xBase +
        Math.sin(v * Math.PI * 2 * 1.6 + col * 0.62) * 34 +
        Math.cos(v * Math.PI * 2 * 4.0 + col * 0.21) * 12;

      points.push({ x, y });
    }

    const color =
      col % 2 === 0
        ? "rgba(190,250,255,0.58)"
        : "rgba(255,190,255,0.50)";

    drawCurve(points, color, 1.35, 7, 8);
  }

  // Large crossing polygon/constellation lines like the reference image.
  const diagonalSets = [
    { slope: 0.38, y: 220, color: "rgba(255,255,255,0.52)" },
    { slope: -0.54, y: 900, color: "rgba(180,245,255,0.50)" },
    { slope: 0.72, y: -180, color: "rgba(255,190,255,0.48)" },
    { slope: -0.22, y: 1450, color: "rgba(255,255,255,0.44)" },
    { slope: 1.05, y: -620, color: "rgba(170,235,255,0.45)" }
  ];

  for (const set of diagonalSets) {
    const points = [];

    for (let x = -200; x <= size + 200; x += 24) {
      const y =
        set.y +
        x * set.slope +
        Math.sin((x / size) * Math.PI * 6) * 22;

      points.push({ x, y });
    }

    drawCurve(points, set.color, 1.65, 4, 10);
  }

  // Tiny stars and specks, still baked into the grid texture.
  for (let i = 0; i < 550; i += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const s = Math.random() < 0.86 ? 2 : 4;

    drawNode(
      x,
      y,
      s,
      0.22 + Math.random() * 0.45,
      Math.random() < 0.5 ? "rgba(255,255,255,1)" : "rgba(180,245,255,1)"
    );
  }

  const texture = new THREE.CanvasTexture(canvas);

  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.15, 3.4);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  return texture;
}

export default function WaveTunnel() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;

    if (!mount) return undefined;

    const isMobile = window.innerWidth < 768;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isMobile,
      alpha: false,
      powerPreference: "high-performance"
    });

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, isMobile ? 1.2 : 1.7)
    );
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x061035, 1);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x061035, 0.018);

    const camera = new THREE.PerspectiveCamera(
      72,
      mount.clientWidth / mount.clientHeight,
      0.1,
      420
    );

    camera.position.set(0, 0, 10);

    const textureLoader = new THREE.TextureLoader();

    const waveTexture = textureLoader.load("/wave-dotted-texture-seamless.jpg");
    waveTexture.wrapS = THREE.RepeatWrapping;
    waveTexture.wrapT = THREE.RepeatWrapping;
    waveTexture.repeat.set(4.6, 15.5);
    waveTexture.colorSpace = THREE.SRGBColorSpace;

    const gridTexture = makeGridCanvasTexture();

    // Colorful wave tunnel layer.
    const bgGeometry = new THREE.CylinderGeometry(
      9.2,
      2.5,
      210,
      isMobile ? 96 : 144,
      isMobile ? 56 : 86,
      true
    );

    bgGeometry.rotateX(Math.PI / 2);
    bgGeometry.translate(0, 0, -86);

    const bgMaterial = new THREE.MeshBasicMaterial({
      map: waveTexture,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.86,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const bgTunnel = new THREE.Mesh(bgGeometry, bgMaterial);
    scene.add(bgTunnel);

    // Transparent grid texture tunnel layer with baked square nodes.
    const gridGeometry = new THREE.CylinderGeometry(
      8.85,
      1.35,
      206,
      isMobile ? 96 : 144,
      isMobile ? 56 : 86,
      true
    );

    gridGeometry.rotateX(Math.PI / 2);
    gridGeometry.translate(0, 0, -84);

    const gridMaterial = new THREE.MeshBasicMaterial({
      map: gridTexture,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const gridTunnel = new THREE.Mesh(gridGeometry, gridMaterial);
    scene.add(gridTunnel);

    // Dark center hole.
    const holeGeometry = new THREE.CircleGeometry(1.45, 72);
    const holeMaterial = new THREE.MeshBasicMaterial({
      color: 0x030018,
      transparent: true,
      opacity: 0.92,
      depthWrite: false
    });

    const hole = new THREE.Mesh(holeGeometry, holeMaterial);
    hole.position.set(0.28, -0.1, -28);
    hole.scale.set(1.35, 0.95, 1);
    scene.add(hole);

    // Purple glowing rim around the hole.
    const rimGeometry = new THREE.TorusGeometry(1.72, 0.09, 10, 96);
    const rimMaterial = new THREE.MeshBasicMaterial({
      color: 0xbd65ff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.position.copy(hole.position);
    rim.scale.copy(hole.scale);
    scene.add(rim);

    // Extra central vortex rings.
    const ringGroup = new THREE.Group();
    const ringGeometries = [];
    const ringMaterials = [];

    scene.add(ringGroup);

    for (let i = 0; i < 34; i += 1) {
      const r = 1.0 + i * 0.115;
      const geo = new THREE.BufferGeometry();
      const pts = [];
      const steps = 160;

      for (let j = 0; j <= steps; j += 1) {
        const a = (j / steps) * Math.PI * 2;
        const wobble =
          Math.sin(a * 5 + i * 0.38) * 0.035 +
          Math.cos(a * 3 - i * 0.27) * 0.025;

        pts.push(
          new THREE.Vector3(
            Math.cos(a) * (r + wobble),
            Math.sin(a) * (r + wobble) * 0.75,
            -24 - i * 1.22
          )
        );
      }

      geo.setFromPoints(pts);

      const mat = new THREE.LineBasicMaterial({
        color: i % 2 === 0 ? 0xffb6ff : 0xc7fbff,
        transparent: true,
        opacity: 0.38 + (1 - i / 34) * 0.26,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      ringGeometries.push(geo);
      ringMaterials.push(mat);

      const line = new THREE.Line(geo, mat);
      ringGroup.add(line);
    }

    const glowGeometry = new THREE.PlaneGeometry(120, 120);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x1f85ff,
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.z = -96;
    scene.add(glow);

    const pointer = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0
    };

    const onPointerMove = (event) => {
      pointer.targetX = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.targetY = (event.clientY / window.innerHeight - 0.5) * 2;
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });

    let animationFrameId;

    const animate = () => {
      const time = performance.now() * 0.001;

      pointer.x += (pointer.targetX - pointer.x) * 0.045;
      pointer.y += (pointer.targetY - pointer.y) * 0.045;

      waveTexture.offset.y = -time * 0.12;
      waveTexture.offset.x = Math.sin(time * 0.18) * 0.045;

      gridTexture.offset.y = -time * 0.2;
      gridTexture.offset.x = Math.sin(time * 0.16) * 0.05;

      bgTunnel.rotation.z = time * 0.055;
      gridTunnel.rotation.z = -time * 0.03;

      const pulse = 1 + Math.sin(time * 0.85) * 0.025;

      bgTunnel.scale.set(pulse, 1 / pulse, 1);
      gridTunnel.scale.set(1 / pulse, pulse, 1);

      hole.rotation.z = time * 0.28;
      rim.rotation.z = time * 0.28;
      rim.scale.set(
        1.35 + Math.sin(time * 1.7) * 0.04,
        0.95 + Math.cos(time * 1.5) * 0.03,
        1
      );

      ringGroup.rotation.z = -time * 0.18;

      camera.position.x = pointer.x * 0.82 + Math.sin(time * 0.36) * 0.1;
      camera.position.y = -pointer.y * 0.58 + Math.cos(time * 0.31) * 0.08;
      camera.rotation.z = Math.sin(time * 0.2) * 0.035 + pointer.x * 0.04;

      glow.rotation.z = time * 0.025;
      glowMaterial.opacity = 0.12 + Math.sin(time * 1.1) * 0.035;

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    const onResize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.2 : 1.7)
      );
      renderer.setSize(width, height);
    };

    window.addEventListener("resize", onResize);

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);

      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", onResize);

      bgGeometry.dispose();
      gridGeometry.dispose();
      holeGeometry.dispose();
      rimGeometry.dispose();
      glowGeometry.dispose();

      bgMaterial.dispose();
      gridMaterial.dispose();
      holeMaterial.dispose();
      rimMaterial.dispose();
      glowMaterial.dispose();

      waveTexture.dispose();
      gridTexture.dispose();

      for (const geo of ringGeometries) {
        geo.dispose();
      }

      for (const mat of ringMaterials) {
        mat.dispose();
      }

      renderer.dispose();

      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <main className="waveTunnelPage">
      <div ref={mountRef} className="waveTunnelCanvas" />
      <div className="waveTunnelVignette" />
      <div className="waveTunnelLabel">Grid Texture With Square Nodes</div>
    </main>
  );
}
