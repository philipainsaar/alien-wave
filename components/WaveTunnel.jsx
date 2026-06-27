"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const TEXTURE_URL = "/wave-cylinder-texture.jpg";

export default function WaveTunnel() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const isMobile = window.innerWidth < 768;
    let animationFrameId = 0;

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
    scene.fog = new THREE.FogExp2(0x03071f, 0.012);

    const camera = new THREE.PerspectiveCamera(
      74,
      mount.clientWidth / mount.clientHeight,
      0.1,
      420
    );

    camera.position.set(0, 0, 8);

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

    const textureLoader = new THREE.TextureLoader();

    function makeFallbackTexture() {
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 1024;

      const ctx = canvas.getContext("2d");

      const gradient = ctx.createRadialGradient(512, 512, 40, 512, 512, 720);
      gradient.addColorStop(0, "#101b66");
      gradient.addColorStop(0.25, "#176aff");
      gradient.addColorStop(0.52, "#00e1da");
      gradient.addColorStop(0.75, "#b56cff");
      gradient.addColorStop(1, "#04071f");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1024, 1024);

      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = "#d9fbff";
      ctx.lineWidth = 2;

      for (let y = -80; y < 1120; y += 48) {
        ctx.beginPath();

        for (let x = -60; x < 1100; x += 12) {
          const yy =
            y +
            Math.sin((x / 1024) * Math.PI * 8 + y * 0.02) * 20 +
            Math.sin((x / 1024) * Math.PI * 18) * 6;

          if (x === -60) ctx.moveTo(x, yy);
          else ctx.lineTo(x, yy);
        }

        ctx.stroke();
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;

      return texture;
    }

    function prepareTexture(texture, repeatX, repeatY) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(repeatX, repeatY);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      return texture;
    }

    function buildScene(baseTexture) {
      const tunnelTexture = keepTexture(prepareTexture(baseTexture, 1.35, 7.5));

      const innerTexture = keepTexture(baseTexture.clone());
      prepareTexture(innerTexture, 0.95, 4.2);

      // Main tunnel only. No flat image plane. No CSS image background.
      // The large front radius starts close to the camera so it fills the full screen.
      const tunnelLength = 176;
      const tunnelGeometry = keepGeometry(
        new THREE.CylinderGeometry(
          18.5,
          1.15,
          tunnelLength,
          isMobile ? 128 : 192,
          isMobile ? 80 : 128,
          true
        )
      );

      tunnelGeometry.rotateX(Math.PI / 2);

      // Top opening is close to the camera, bottom goes far away.
      // After rotateX, top is at +length/2 on z. Translate puts top at z=4.
      tunnelGeometry.translate(0, 0, 4 - tunnelLength / 2);

      const tunnelMaterial = keepMaterial(
        new THREE.MeshBasicMaterial({
          map: tunnelTexture,
          color: 0xaee7ff,
          side: THREE.BackSide,
          transparent: false,
          depthWrite: false,
        })
      );

      const tunnel = new THREE.Mesh(tunnelGeometry, tunnelMaterial);
      scene.add(tunnel);

      // Second softer cylinder layer for watery depth, also curved, never flat.
      const innerLength = 116;
      const innerGeometry = keepGeometry(
        new THREE.CylinderGeometry(
          8.2,
          0.38,
          innerLength,
          isMobile ? 96 : 144,
          isMobile ? 54 : 84,
          true
        )
      );

      innerGeometry.rotateX(Math.PI / 2);
      innerGeometry.translate(0, 0, -10 - innerLength / 2);

      const innerMaterial = keepMaterial(
        new THREE.MeshBasicMaterial({
          map: innerTexture,
          color: 0x83eaff,
          side: THREE.BackSide,
          transparent: true,
          opacity: 0.42,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );

      const innerTunnel = new THREE.Mesh(innerGeometry, innerMaterial);
      scene.add(innerTunnel);

      // Wire grid to make it read as 3D display/tunnel.
      const wireGeometry = keepGeometry(
        new THREE.CylinderGeometry(
          18.2,
          0.95,
          tunnelLength,
          isMobile ? 42 : 56,
          isMobile ? 62 : 92,
          true
        )
      );

      wireGeometry.rotateX(Math.PI / 2);
      wireGeometry.translate(0, 0, 4 - tunnelLength / 2);

      const wireMaterial = keepMaterial(
        new THREE.MeshBasicMaterial({
          color: 0xf3e7ff,
          wireframe: true,
          transparent: true,
          opacity: 0.22,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );

      const wireTunnel = new THREE.Mesh(wireGeometry, wireMaterial);
      scene.add(wireTunnel);

      // Star/water specks in 3D space, not a flat image.
      const particleCount = isMobile ? 650 : 1100;
      const particlePositions = new Float32Array(particleCount * 3);
      const particleColors = new Float32Array(particleCount * 3);
      const color = new THREE.Color();

      for (let i = 0; i < particleCount; i += 1) {
        const depth = Math.random();
        const z = 2 - depth * 160;
        const radius = 2 + depth * 16;
        const angle = Math.random() * Math.PI * 2;

        particlePositions[i * 3] = Math.cos(angle) * radius;
        particlePositions[i * 3 + 1] = Math.sin(angle) * radius * 0.86;
        particlePositions[i * 3 + 2] = z;

        const hue = Math.random() < 0.5 ? 0.52 : 0.8;
        color.setHSL(hue, 0.7, 0.72 + Math.random() * 0.22);

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
          size: isMobile ? 0.05 : 0.04,
          vertexColors: true,
          transparent: true,
          opacity: 0.72,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );

      const particles = new THREE.Points(particleGeometry, particleMaterial);
      scene.add(particles);

      // Vortex rings toward the hole.
      const ringGroup = new THREE.Group();
      scene.add(ringGroup);

      for (let i = 0; i < 44; i += 1) {
        const radius = 0.58 + i * 0.15;
        const z = -18 - i * 1.15;
        const points = [];
        const steps = 170;

        for (let j = 0; j <= steps; j += 1) {
          const angle = (j / steps) * Math.PI * 2;

          const wobble =
            Math.sin(angle * 5 + i * 0.32) * 0.05 +
            Math.cos(angle * 3 - i * 0.24) * 0.035;

          points.push(
            new THREE.Vector3(
              Math.cos(angle + i * 0.04) * (radius + wobble),
              Math.sin(angle + i * 0.04) * (radius + wobble) * 0.8,
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
            opacity: Math.max(0.11, 0.52 - i * 0.007),
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        );

        ringGroup.add(new THREE.Line(ringGeometry, ringMaterial));
      }

      // Dark center hole.
      const holeGeometry = keepGeometry(new THREE.CircleGeometry(1.02, 90));
      const holeMaterial = keepMaterial(
        new THREE.MeshBasicMaterial({
          color: 0x020014,
          transparent: true,
          opacity: 0.97,
          depthWrite: false,
        })
      );

      const hole = new THREE.Mesh(holeGeometry, holeMaterial);
      hole.position.set(0.16, -0.06, -18);
      hole.scale.set(1.25, 0.9, 1);
      scene.add(hole);

      const rimGeometry = keepGeometry(new THREE.TorusGeometry(1.22, 0.08, 12, 96));
      const rimMaterial = keepMaterial(
        new THREE.MeshBasicMaterial({
          color: 0xc18cff,
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );

      const rim = new THREE.Mesh(rimGeometry, rimMaterial);
      rim.position.copy(hole.position);
      rim.scale.copy(hole.scale);
      scene.add(rim);

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

      const animate = () => {
        const time = performance.now() * 0.001;

        pointer.x += (pointer.tx - pointer.x) * 0.04;
        pointer.y += (pointer.ty - pointer.y) * 0.04;

        tunnelTexture.offset.y = -time * 0.11;
        tunnelTexture.offset.x = Math.sin(time * 0.2) * 0.035;

        innerTexture.offset.y = -time * 0.22;
        innerTexture.offset.x = Math.sin(time * 0.26) * 0.055;

        tunnel.rotation.z = time * 0.055;
        innerTunnel.rotation.z = -time * 0.09;
        wireTunnel.rotation.z = -time * 0.032;
        particles.rotation.z = time * 0.018;
        ringGroup.rotation.z = -time * 0.16;

        const pulse = 1 + Math.sin(time * 0.85) * 0.018;
        tunnel.scale.set(pulse, 1 / pulse, 1);
        innerTunnel.scale.set(1 / pulse, pulse, 1);

        hole.rotation.z = time * 0.24;
        rim.rotation.z = time * 0.24;
        rim.scale.set(
          1.25 + Math.sin(time * 1.7) * 0.035,
          0.9 + Math.cos(time * 1.5) * 0.025,
          1
        );

        camera.position.x = pointer.x * 0.5 + Math.sin(time * 0.35) * 0.05;
        camera.position.y = -pointer.y * 0.35 + Math.cos(time * 0.28) * 0.04;
        camera.rotation.z = Math.sin(time * 0.18) * 0.016 + pointer.x * 0.02;

        renderer.render(scene, camera);
        animationFrameId = requestAnimationFrame(animate);
      };

      animate();

      return () => {
        window.removeEventListener("pointermove", onPointerMove);
      };
    }

    let cleanupScene = () => {};

    textureLoader.load(
      TEXTURE_URL,
      (texture) => {
        cleanupScene = buildScene(texture);
      },
      undefined,
      () => {
        cleanupScene = buildScene(makeFallbackTexture());
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
      cancelAnimationFrame(animationFrameId);
      cleanupScene();

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
