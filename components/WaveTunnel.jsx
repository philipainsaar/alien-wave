"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const TEXTURE_URL = "/wave-dotted-texture-seamless.jpg";

function makeFallbackTexture() {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");

  const gradient = ctx.createRadialGradient(
    size * 0.5,
    size * 0.5,
    size * 0.05,
    size * 0.5,
    size * 0.5,
    size * 0.72
  );

  gradient.addColorStop(0, "#2b0060");
  gradient.addColorStop(0.25, "#1849ff");
  gradient.addColorStop(0.55, "#00d7c8");
  gradient.addColorStop(0.78, "#cf58ff");
  gradient.addColorStop(1, "#03051f");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  ctx.globalAlpha = 0.8;
  ctx.lineWidth = 2;

  for (let y = -60; y < size + 60; y += 42) {
    ctx.beginPath();
    ctx.strokeStyle = y % 84 === 0 ? "#ffffff" : "#ffc6ff";

    for (let x = -40; x <= size + 40; x += 12) {
      const yy =
        y +
        Math.sin((x / size) * Math.PI * 8 + y * 0.02) * 22 +
        Math.sin((x / size) * Math.PI * 19 + y * 0.01) * 5;

      if (x === -40) {
        ctx.moveTo(x, yy);
      } else {
        ctx.lineTo(x, yy);
      }

      if (x % 72 === 0) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x - 4, yy - 4, 8, 8);
      }
    }

    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeTextureCopy(baseTexture, repeatX, repeatY) {
  const texture = baseTexture.clone();
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export default function WaveTunnel() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    let disposed = false;
    let animationFrameId = 0;

    const isMobile = window.innerWidth < 768;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isMobile,
      alpha: false,
      powerPreference: "high-performance",
    });

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, isMobile ? 1.1 : 1.5)
    );
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x061035, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x061035);
    scene.fog = new THREE.FogExp2(0x061035, 0.006);

    const camera = new THREE.PerspectiveCamera(
      76,
      mount.clientWidth / mount.clientHeight,
      0.1,
      650
    );

    camera.position.set(0, 0, 0);

    const pointer = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
    };

    const resources = {
      geometries: [],
      materials: [],
      textures: [],
    };

    function trackGeometry(geometry) {
      resources.geometries.push(geometry);
      return geometry;
    }

    function trackMaterial(material) {
      resources.materials.push(material);
      return material;
    }

    function trackTexture(texture) {
      resources.textures.push(texture);
      return texture;
    }

    function buildScene(baseTexture) {
      if (disposed) return;

      const bgTexture = trackTexture(makeTextureCopy(baseTexture, 1.15, 1.8));
      const tunnelTexture = trackTexture(makeTextureCopy(baseTexture, 3.4, 11.0));
      const innerTexture = trackTexture(makeTextureCopy(baseTexture, 1.8, 6.2));

      // Big full-screen background plane in front of the camera's far view.
      const bgGeometry = trackGeometry(new THREE.PlaneGeometry(140, 220));
      const bgMaterial = trackMaterial(
        new THREE.MeshBasicMaterial({
          map: bgTexture,
          color: 0xffffff,
          transparent: false,
          depthWrite: false,
          depthTest: false,
          side: THREE.DoubleSide,
        })
      );

      const bgPlane = new THREE.Mesh(bgGeometry, bgMaterial);
      bgPlane.position.set(0, 0, -120);
      bgPlane.renderOrder = -1000;
      scene.add(bgPlane);

      // Tunnel starts at camera and goes into screen.
      // No front cap, so you see inside it immediately.
      const tunnelGeometry = trackGeometry(
        new THREE.CylinderGeometry(
          24,
          1.2,
          260,
          isMobile ? 112 : 168,
          isMobile ? 80 : 120,
          true
        )
      );

      tunnelGeometry.rotateX(Math.PI / 2);
      tunnelGeometry.translate(0, 0, -130);

      const tunnelMaterial = trackMaterial(
        new THREE.MeshBasicMaterial({
          map: tunnelTexture,
          color: 0xffffff,
          side: THREE.BackSide,
          transparent: true,
          opacity: 0.96,
          depthWrite: false,
          blending: THREE.NormalBlending,
        })
      );

      const tunnel = new THREE.Mesh(tunnelGeometry, tunnelMaterial);
      scene.add(tunnel);

      const innerGeometry = trackGeometry(
        new THREE.CylinderGeometry(
          10,
          0.42,
          150,
          isMobile ? 72 : 112,
          isMobile ? 44 : 76,
          true
        )
      );

      innerGeometry.rotateX(Math.PI / 2);
      innerGeometry.translate(0, 0, -78);

      const innerMaterial = trackMaterial(
        new THREE.MeshBasicMaterial({
          map: innerTexture,
          color: 0xc9f9ff,
          side: THREE.BackSide,
          transparent: true,
          opacity: 0.56,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );

      const innerTunnel = new THREE.Mesh(innerGeometry, innerMaterial);
      scene.add(innerTunnel);

      // Wire grid overlay.
      const wireGeometry = trackGeometry(
        new THREE.CylinderGeometry(
          23.8,
          1.0,
          258,
          isMobile ? 36 : 48,
          isMobile ? 54 : 78,
          true
        )
      );

      wireGeometry.rotateX(Math.PI / 2);
      wireGeometry.translate(0, 0, -129);

      const wireMaterial = trackMaterial(
        new THREE.MeshBasicMaterial({
          color: 0xffd5ff,
          wireframe: true,
          transparent: true,
          opacity: 0.28,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );

      const wireTunnel = new THREE.Mesh(wireGeometry, wireMaterial);
      scene.add(wireTunnel);

      // Vortex rings and dark center.
      const ringGroup = new THREE.Group();
      scene.add(ringGroup);

      for (let i = 0; i < 58; i += 1) {
        const radius = 0.35 + i * 0.16;
        const geometry = trackGeometry(new THREE.BufferGeometry());
        const points = [];
        const steps = 170;

        for (let j = 0; j <= steps; j += 1) {
          const angle = (j / steps) * Math.PI * 2;

          const wobble =
            Math.sin(angle * 5 + i * 0.38) * 0.055 +
            Math.cos(angle * 3 - i * 0.27) * 0.035;

          points.push(
            new THREE.Vector3(
              Math.cos(angle) * (radius + wobble),
              Math.sin(angle) * (radius + wobble) * 0.76,
              -22 - i * 1.25
            )
          );
        }

        geometry.setFromPoints(points);

        const material = trackMaterial(
          new THREE.LineBasicMaterial({
            color: i % 2 === 0 ? 0xffb6ff : 0xbefaff,
            transparent: true,
            opacity: Math.max(0.12, 0.66 - i * 0.007),
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          })
        );

        ringGroup.add(new THREE.Line(geometry, material));
      }

      const holeGeometry = trackGeometry(new THREE.CircleGeometry(1.0, 72));
      const holeMaterial = trackMaterial(
        new THREE.MeshBasicMaterial({
          color: 0x020014,
          transparent: true,
          opacity: 0.95,
          depthWrite: false,
        })
      );

      const hole = new THREE.Mesh(holeGeometry, holeMaterial);
      hole.position.set(0.18, -0.08, -21);
      hole.scale.set(1.36, 0.92, 1);
      scene.add(hole);

      const rimGeometry = trackGeometry(new THREE.TorusGeometry(1.24, 0.08, 10, 96));
      const rimMaterial = trackMaterial(
        new THREE.MeshBasicMaterial({
          color: 0xb56cff,
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );

      const rim = new THREE.Mesh(rimGeometry, rimMaterial);
      rim.position.copy(hole.position);
      rim.scale.copy(hole.scale);
      scene.add(rim);

      function animate() {
        if (disposed) return;

        const time = performance.now() * 0.001;

        pointer.x += (pointer.targetX - pointer.x) * 0.04;
        pointer.y += (pointer.targetY - pointer.y) * 0.04;

        bgTexture.offset.y = -time * 0.018;
        bgTexture.offset.x = Math.sin(time * 0.12) * 0.02;

        tunnelTexture.offset.y = -time * 0.11;
        tunnelTexture.offset.x = Math.sin(time * 0.18) * 0.04;

        innerTexture.offset.y = -time * 0.22;
        innerTexture.offset.x = Math.sin(time * 0.25) * 0.055;

        tunnel.rotation.z = time * 0.035;
        innerTunnel.rotation.z = -time * 0.08;
        wireTunnel.rotation.z = -time * 0.03;
        ringGroup.rotation.z = -time * 0.18;

        const pulse = 1 + Math.sin(time * 0.85) * 0.025;
        tunnel.scale.set(pulse, 1 / pulse, 1);
        innerTunnel.scale.set(1 / pulse, pulse, 1);

        hole.rotation.z = time * 0.26;
        rim.rotation.z = time * 0.26;
        rim.scale.set(
          1.36 + Math.sin(time * 1.7) * 0.04,
          0.92 + Math.cos(time * 1.5) * 0.03,
          1
        );

        camera.position.x = pointer.x * 0.7 + Math.sin(time * 0.36) * 0.08;
        camera.position.y = -pointer.y * 0.5 + Math.cos(time * 0.31) * 0.06;
        camera.rotation.z = Math.sin(time * 0.2) * 0.025 + pointer.x * 0.035;

        renderer.render(scene, camera);
        animationFrameId = requestAnimationFrame(animate);
      }

      animate();
    }

    const loader = new THREE.TextureLoader();

    loader.load(
      TEXTURE_URL,
      (loadedTexture) => {
        loadedTexture.colorSpace = THREE.SRGBColorSpace;
        loadedTexture.needsUpdate = true;
        buildScene(loadedTexture);
      },
      undefined,
      () => {
        const fallbackTexture = makeFallbackTexture();
        buildScene(fallbackTexture);
      }
    );

    function onPointerMove(event) {
      pointer.targetX = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.targetY = (event.clientY / window.innerHeight - 0.5) * 2;
    }

    function onResize() {
      const width = mount.clientWidth;
      const height = mount.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setPixelRatio(
        Math.min(
          window.devicePixelRatio || 1,
          window.innerWidth < 768 ? 1.1 : 1.5
        )
      );
      renderer.setSize(width, height);
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrameId);

      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", onResize);

      for (const geometry of resources.geometries) {
        geometry.dispose();
      }

      for (const material of resources.materials) {
        material.dispose();
      }

      for (const texture of resources.textures) {
        texture.dispose();
      }

      renderer.dispose();

      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100dvh",
        overflow: "hidden",
        backgroundColor: "#061035",
        backgroundImage: `url("${TEXTURE_URL}")`,
        backgroundSize: "900px 900px",
        backgroundRepeat: "repeat",
        backgroundPosition: "center",
      }}
    >
      <div
        ref={mountRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          background: "#061035",
        }}
      />
    </main>
  );
}
