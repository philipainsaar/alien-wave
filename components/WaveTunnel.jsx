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

  const gradient = ctx.createRadialGradient(size * 0.5, size * 0.45, size * 0.05, size * 0.5, size * 0.5, size * 0.8);
  gradient.addColorStop(0, "#09144f");
  gradient.addColorStop(0.28, "#0076ff");
  gradient.addColorStop(0.52, "#00e5d4");
  gradient.addColorStop(0.74, "#d75dff");
  gradient.addColorStop(1, "#03102e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (let row = -2; row < 22; row += 1) {
    const yBase = row * 64;
    const color = row % 3 === 0 ? "rgba(255, 205, 255, 0.72)" : row % 3 === 1 ? "rgba(160, 255, 255, 0.72)" : "rgba(255, 255, 255, 0.58)";
    ctx.strokeStyle = color;
    ctx.lineWidth = row % 5 === 0 ? 2.2 : 1.4;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();

    for (let x = -60; x <= size + 60; x += 12) {
      const u = x / size;
      const y = yBase + Math.sin(u * Math.PI * 2 * 2 + row * 0.7) * 28 + Math.sin(u * Math.PI * 2 * 5 + row * 0.3) * 8;
      if (x === -60) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      if (x % 72 === 0) {
        ctx.fillStyle = row % 2 === 0 ? "#ffffff" : "#ffd4ff";
        ctx.fillRect(x - 5, y - 5, 10, 10);
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

function copyTexture(baseTexture, repeatX, repeatY) {
  const texture = baseTexture.clone();
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createSquareNodeTexture() {
  const size = 96;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "#ffffff";
  ctx.shadowBlur = 12;
  ctx.fillRect(28, 28, 40, 40);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.15 : 1.6));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x061035, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x061035);
    scene.fog = new THREE.FogExp2(0x061035, 0.012);

    const camera = new THREE.PerspectiveCamera(72, mount.clientWidth / mount.clientHeight, 0.1, 360);
    camera.position.set(0, 0, 9);

    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const resources = { geometries: [], materials: [], textures: [] };

    const keepGeometry = (geometry) => {
      resources.geometries.push(geometry);
      return geometry;
    };
    const keepMaterial = (material) => {
      resources.materials.push(material);
      return material;
    };
    const keepTexture = (texture) => {
      resources.textures.push(texture);
      return texture;
    };

    function buildScene(baseTexture) {
      if (disposed) return;

      const bgTexture = keepTexture(copyTexture(baseTexture, 1.15, 1.75));
      const tunnelTexture = keepTexture(copyTexture(baseTexture, 2.8, 8.6));
      const innerTexture = keepTexture(copyTexture(baseTexture, 1.65, 5.5));
      const nodeTexture = keepTexture(createSquareNodeTexture());

      const backgroundGeometry = keepGeometry(new THREE.PlaneGeometry(54, 96));
      const backgroundMaterial = keepMaterial(new THREE.MeshBasicMaterial({
        map: bgTexture,
        transparent: false,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide,
      }));
      const backgroundPlane = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
      backgroundPlane.position.set(0, 0, -55);
      backgroundPlane.renderOrder = -100;
      scene.add(backgroundPlane);

      const tunnelGeometry = keepGeometry(new THREE.CylinderGeometry(9.2, 1.05, 168, isMobile ? 96 : 144, isMobile ? 60 : 86, true));
      tunnelGeometry.rotateX(Math.PI / 2);
      tunnelGeometry.translate(0, 0, -72);
      const tunnelMaterial = keepMaterial(new THREE.MeshBasicMaterial({
        map: tunnelTexture,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.9,
        blending: THREE.NormalBlending,
        depthWrite: false,
      }));
      const tunnel = new THREE.Mesh(tunnelGeometry, tunnelMaterial);
      scene.add(tunnel);

      const innerGeometry = keepGeometry(new THREE.CylinderGeometry(6.2, 0.42, 104, isMobile ? 72 : 112, isMobile ? 38 : 62, true));
      innerGeometry.rotateX(Math.PI / 2);
      innerGeometry.translate(0, 0, -52);
      const innerMaterial = keepMaterial(new THREE.MeshBasicMaterial({
        map: innerTexture,
        color: 0xbefaff,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.48,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }));
      const innerTunnel = new THREE.Mesh(innerGeometry, innerMaterial);
      scene.add(innerTunnel);

      const wireGeometry = keepGeometry(new THREE.CylinderGeometry(9.05, 0.9, 166, isMobile ? 34 : 46, isMobile ? 46 : 68, true));
      wireGeometry.rotateX(Math.PI / 2);
      wireGeometry.translate(0, 0, -71);
      const wireMaterial = keepMaterial(new THREE.MeshBasicMaterial({
        color: 0xfbd7ff,
        wireframe: true,
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }));
      const wireTunnel = new THREE.Mesh(wireGeometry, wireMaterial);
      scene.add(wireTunnel);

      const nodeCount = isMobile ? 180 : 260;
      const nodePositions = new Float32Array(nodeCount * 3);
      for (let i = 0; i < nodeCount; i += 1) {
        const z = -8 - Math.random() * 86;
        const t = Math.min(1, Math.abs(z + 8) / 86);
        const radius = 8.6 - t * 6.8;
        const angle = Math.random() * Math.PI * 2;
        nodePositions[i * 3] = Math.cos(angle) * radius;
        nodePositions[i * 3 + 1] = Math.sin(angle) * radius * 0.84;
        nodePositions[i * 3 + 2] = z;
      }
      const nodeGeometry = keepGeometry(new THREE.BufferGeometry());
      nodeGeometry.setAttribute("position", new THREE.BufferAttribute(nodePositions, 3));
      const nodeMaterial = keepMaterial(new THREE.PointsMaterial({
        map: nodeTexture,
        color: 0xffffff,
        size: isMobile ? 0.32 : 0.28,
        transparent: true,
        opacity: 0.88,
        alphaTest: 0.1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }));
      const nodes = new THREE.Points(nodeGeometry, nodeMaterial);
      scene.add(nodes);

      const ringGroup = new THREE.Group();
      scene.add(ringGroup);
      for (let i = 0; i < 42; i += 1) {
        const radius = 0.58 + i * 0.13;
        const geometry = keepGeometry(new THREE.BufferGeometry());
        const points = [];
        const steps = 170;
        for (let j = 0; j <= steps; j += 1) {
          const angle = (j / steps) * Math.PI * 2;
          const wobble = Math.sin(angle * 5 + i * 0.38) * 0.045 + Math.cos(angle * 3 - i * 0.27) * 0.032;
          points.push(new THREE.Vector3(Math.cos(angle) * (radius + wobble), Math.sin(angle) * (radius + wobble) * 0.78, -18 - i * 1.08));
        }
        geometry.setFromPoints(points);
        const material = keepMaterial(new THREE.LineBasicMaterial({
          color: i % 2 === 0 ? 0xffb6ff : 0xc7fbff,
          transparent: true,
          opacity: Math.max(0.12, 0.56 - i * 0.007),
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }));
        ringGroup.add(new THREE.Line(geometry, material));
      }

      const holeGeometry = keepGeometry(new THREE.CircleGeometry(0.95, 72));
      const holeMaterial = keepMaterial(new THREE.MeshBasicMaterial({
        color: 0x020014,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      }));
      const hole = new THREE.Mesh(holeGeometry, holeMaterial);
      hole.position.set(0.18, -0.08, -18);
      hole.scale.set(1.28, 0.9, 1);
      scene.add(hole);

      const rimGeometry = keepGeometry(new THREE.TorusGeometry(1.14, 0.08, 10, 96));
      const rimMaterial = keepMaterial(new THREE.MeshBasicMaterial({
        color: 0xb56cff,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }));
      const rim = new THREE.Mesh(rimGeometry, rimMaterial);
      rim.position.copy(hole.position);
      rim.scale.copy(hole.scale);
      scene.add(rim);

      function animate() {
        if (disposed) return;
        const time = performance.now() * 0.001;
        pointer.x += (pointer.targetX - pointer.x) * 0.04;
        pointer.y += (pointer.targetY - pointer.y) * 0.04;

        bgTexture.offset.y = -time * 0.02;
        bgTexture.offset.x = Math.sin(time * 0.12) * 0.02;
        tunnelTexture.offset.y = -time * 0.1;
        tunnelTexture.offset.x = Math.sin(time * 0.18) * 0.04;
        innerTexture.offset.y = -time * 0.2;
        innerTexture.offset.x = Math.sin(time * 0.25) * 0.055;

        tunnel.rotation.z = time * 0.03;
        innerTunnel.rotation.z = -time * 0.075;
        wireTunnel.rotation.z = -time * 0.025;
        nodes.rotation.z = -time * 0.02;
        ringGroup.rotation.z = -time * 0.18;

        const pulse = 1 + Math.sin(time * 0.85) * 0.02;
        tunnel.scale.set(pulse, 1 / pulse, 1);
        innerTunnel.scale.set(1 / pulse, pulse, 1);

        hole.rotation.z = time * 0.24;
        rim.rotation.z = time * 0.24;
        rim.scale.set(1.28 + Math.sin(time * 1.7) * 0.04, 0.9 + Math.cos(time * 1.5) * 0.03, 1);

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
        buildScene(makeFallbackTexture());
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
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.15 : 1.6));
      renderer.setSize(width, height);
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", onResize);
      for (const geometry of resources.geometries) geometry.dispose();
      for (const material of resources.materials) material.dispose();
      for (const texture of resources.textures) texture.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <main className="waveTunnelPage">
      <div ref={mountRef} className="waveTunnelCanvas" />
    </main>
  );
}
