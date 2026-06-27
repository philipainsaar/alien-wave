"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const TEXTURE_URL = "/wave-cylinder-texture.jpg";

function makeFallbackTexture() {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, "#b9d8ff");
  gradient.addColorStop(0.35, "#d9b7ff");
  gradient.addColorStop(0.7, "#9ff5ff");
  gradient.addColorStop(1, "#101640");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;

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
      Math.min(window.devicePixelRatio || 1, isMobile ? 1.15 : 1.65)
    );
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x03071f, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x03071f);
    scene.fog = new THREE.FogExp2(0x03071f, 0.006);

    const camera = new THREE.PerspectiveCamera(
      74,
      mount.clientWidth / mount.clientHeight,
      0.1,
      420
    );

    // Camera is INSIDE the tunnel.
    // This is the important fix: no front opening/disk can be seen.
    camera.position.set(0, 0, 0);

    const resources = {
      geometries: [],
      materials: [],
      textures: [],
    };

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

    const pointer = {
      x: 0,
      y: 0,
      tx: 0,
      ty: 0,
    };

    const onPointerMove = (event) => {
      pointer.tx = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (event.clientY / window.innerHeight - 0.5) * 2;
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const textureLoader = new THREE.TextureLoader();

    function prepareTexture(texture, repeatX, repeatY) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(repeatX, repeatY);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      return texture;
    }

    function buildScene(baseTexture) {
      if (disposed) return;

      const tunnelTexture = keepTexture(prepareTexture(baseTexture, 1.2, 8.5));

      const secondTexture = keepTexture(baseTexture.clone());
      prepareTexture(secondTexture, 0.9, 5.2);

      // Straight long cylinder with the camera inside it.
      // It extends from z=+18 behind the camera to z=-230 in front.
      // Because the near edge is behind the camera, there is no visible giant circle.
      const tunnelLength = 248;
      const tunnelRadius = 8.4;

      const tunnelGeometry = keepGeometry(
        new THREE.CylinderGeometry(
          tunnelRadius,
          tunnelRadius,
          tunnelLength,
          isMobile ? 128 : 192,
          isMobile ? 96 : 140,
          true
        )
      );

      tunnelGeometry.rotateX(Math.PI / 2);
      tunnelGeometry.translate(0, 0, -106);

      const tunnelMaterial = keepMaterial(
        new THREE.MeshBasicMaterial({
          map: tunnelTexture,
          side: THREE.BackSide,
          transparent: false,
          depthWrite: false,
        })
      );

      const tunnel = new THREE.Mesh(tunnelGeometry, tunnelMaterial);
      scene.add(tunnel);

      // Second transparent rotating layer for watery depth.
      const secondGeometry = keepGeometry(
        new THREE.CylinderGeometry(
          7.7,
          7.7,
          tunnelLength,
          isMobile ? 96 : 144,
          isMobile ? 72 : 110,
          true
        )
      );

      secondGeometry.rotateX(Math.PI / 2);
      secondGeometry.translate(0, 0, -106);

      const secondMaterial = keepMaterial(
        new THREE.MeshBasicMaterial({
          map: secondTexture,
          color: 0xb9f8ff,
          side: THREE.BackSide,
          transparent: true,
          opacity: 0.34,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );

      const secondTunnel = new THREE.Mesh(secondGeometry, secondMaterial);
      scene.add(secondTunnel);

      // Wire grid overlay on the same cylinder shape.
      const wireGeometry = keepGeometry(
        new THREE.CylinderGeometry(
          8.28,
          8.28,
          tunnelLength,
          isMobile ? 42 : 58,
          isMobile ? 70 : 100,
          true
        )
      );

      wireGeometry.rotateX(Math.PI / 2);
      wireGeometry.translate(0, 0, -106);

      const wireMaterial = keepMaterial(
        new THREE.MeshBasicMaterial({
          color: 0xf7edff,
          wireframe: true,
          transparent: true,
          opacity: 0.2,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );

      const wireTunnel = new THREE.Mesh(wireGeometry, wireMaterial);
      scene.add(wireTunnel);

      // Small 3D particles inside the tunnel.
      const particleCount = isMobile ? 450 : 850;
      const particlePositions = new Float32Array(particleCount * 3);
      const particleColors = new Float32Array(particleCount * 3);
      const color = new THREE.Color();

      for (let i = 0; i < particleCount; i += 1) {
        const z = -Math.random() * 220;
        const radius = 1.2 + Math.random() * 7.0;
        const angle = Math.random() * Math.PI * 2;

        particlePositions[i * 3] = Math.cos(angle) * radius;
        particlePositions[i * 3 + 1] = Math.sin(angle) * radius;
        particlePositions[i * 3 + 2] = z;

        color.setHSL(Math.random() < 0.55 ? 0.52 : 0.8, 0.55, 0.82);

        particleColors[i * 3] = color.r;
        particleColors[i * 3 + 1] = color.g;
        particleColors[i * 3 + 2] = color.b;
      }

      const particleGeometry = keepGeometry(new THREE.BufferGeometry());
      particleGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(particlePositions, 3)
      );
      particleGeometry.setAttribute(
        "color",
        new THREE.BufferAttribute(particleColors, 3)
      );

      const particleMaterial = keepMaterial(
        new THREE.PointsMaterial({
          size: isMobile ? 0.045 : 0.035,
          vertexColors: true,
          transparent: true,
          opacity: 0.72,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );

      const particles = new THREE.Points(particleGeometry, particleMaterial);
      scene.add(particles);

      // Far dark vortex center.
      const holeGeometry = keepGeometry(new THREE.CircleGeometry(1.15, 96));
      const holeMaterial = keepMaterial(
        new THREE.MeshBasicMaterial({
          color: 0x010014,
          transparent: true,
          opacity: 0.96,
          depthWrite: false,
        })
      );

      const hole = new THREE.Mesh(holeGeometry, holeMaterial);
      hole.position.set(0.15, -0.08, -72);
      hole.scale.set(1.28, 0.9, 1);
      scene.add(hole);

      const rimGeometry = keepGeometry(new THREE.TorusGeometry(1.36, 0.075, 12, 128));
      const rimMaterial = keepMaterial(
        new THREE.MeshBasicMaterial({
          color: 0xc18cff,
          transparent: true,
          opacity: 0.88,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );

      const rim = new THREE.Mesh(rimGeometry, rimMaterial);
      rim.position.copy(hole.position);
      rim.scale.copy(hole.scale);
      scene.add(rim);

      // Extra spiral/ring lines near the center.
      const ringGroup = new THREE.Group();
      scene.add(ringGroup);

      for (let i = 0; i < 34; i += 1) {
        const radius = 1.25 + i * 0.14;
        const z = -72 - i * 1.3;
        const points = [];
        const steps = 160;

        for (let j = 0; j <= steps; j += 1) {
          const angle = (j / steps) * Math.PI * 2;

          const wobble =
            Math.sin(angle * 5 + i * 0.32) * 0.045 +
            Math.cos(angle * 3 - i * 0.22) * 0.03;

          points.push(
            new THREE.Vector3(
              Math.cos(angle + i * 0.045) * (radius + wobble),
              Math.sin(angle + i * 0.045) * (radius + wobble) * 0.82,
              z
            )
          );
        }

        const ringGeometry = keepGeometry(
          new THREE.BufferGeometry().setFromPoints(points)
        );

        const ringMaterial = keepMaterial(
          new THREE.LineBasicMaterial({
            color: i % 2 === 0 ? 0xffd0ff : 0xc8fbff,
            transparent: true,
            opacity: Math.max(0.1, 0.42 - i * 0.008),
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        );

        ringGroup.add(new THREE.Line(ringGeometry, ringMaterial));
      }

      const animate = () => {
        if (disposed) return;

        const time = performance.now() * 0.001;

        pointer.x += (pointer.tx - pointer.x) * 0.04;
        pointer.y += (pointer.ty - pointer.y) * 0.04;

        tunnelTexture.offset.y = -time * 0.11;
        tunnelTexture.offset.x = Math.sin(time * 0.18) * 0.035;

        secondTexture.offset.y = -time * 0.22;
        secondTexture.offset.x = Math.sin(time * 0.26) * 0.055;

        tunnel.rotation.z = time * 0.055;
        secondTunnel.rotation.z = -time * 0.08;
        wireTunnel.rotation.z = -time * 0.028;
        particles.rotation.z = time * 0.018;
        ringGroup.rotation.z = -time * 0.14;

        const pulse = 1 + Math.sin(time * 0.85) * 0.012;
        tunnel.scale.set(pulse, pulse, 1);
        secondTunnel.scale.set(1 / pulse, 1 / pulse, 1);

        hole.rotation.z = time * 0.24;
        rim.rotation.z = time * 0.24;

        camera.position.x = pointer.x * 0.35 + Math.sin(time * 0.32) * 0.035;
        camera.position.y = -pointer.y * 0.26 + Math.cos(time * 0.29) * 0.03;
        camera.rotation.z = Math.sin(time * 0.18) * 0.012 + pointer.x * 0.015;

        renderer.render(scene, camera);
        animationFrameId = requestAnimationFrame(animate);
      };

      animate();
    }

    textureLoader.load(
      TEXTURE_URL,
      (texture) => {
        buildScene(texture);
      },
      undefined,
      () => {
        buildScene(makeFallbackTexture());
      }
    );

    const onResize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setPixelRatio(
        Math.min(
          window.devicePixelRatio || 1,
          window.innerWidth < 768 ? 1.15 : 1.65
        )
      );
      renderer.setSize(width, height);
    };

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

      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <main className="waveTunnelPage">
      <div ref={mountRef} className="waveTunnelCanvas" />
      <div className="waveTunnelVignette" />
    </main>
  );
}
