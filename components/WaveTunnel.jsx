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

    const renderer = new THREE.WebGLRenderer({
      antialias: !isMobile,
      alpha: false,
      powerPreference: "high-performance",
    });

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, isMobile ? 1.2 : 1.7)
    );
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x080b24, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080b24);

    const camera = new THREE.PerspectiveCamera(
      72,
      mount.clientWidth / mount.clientHeight,
      0.1,
      300
    );
    camera.position.set(0, 0, 5.5);

    const loader = new THREE.TextureLoader();

    function makeFallbackTexture() {
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext("2d");

      const g = ctx.createLinearGradient(0, 0, 1024, 1024);
      g.addColorStop(0, "#cbb8ff");
      g.addColorStop(0.33, "#a8dbff");
      g.addColorStop(0.66, "#f2c6f7");
      g.addColorStop(1, "#e9e2ff");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 1024, 1024);

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      return tex;
    }

    const resources = [];
    const track = (item) => (resources.push(item), item);

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

    function build(texture) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1.35, 3.6);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      track(texture);

      const bgTexture = track(texture.clone());
      bgTexture.wrapS = THREE.RepeatWrapping;
      bgTexture.wrapT = THREE.RepeatWrapping;
      bgTexture.repeat.set(1.2, 1.2);

      // Background plane with same image
      const bgGeo = track(new THREE.PlaneGeometry(44, 80));
      const bgMat = track(
        new THREE.MeshBasicMaterial({
          map: bgTexture,
          transparent: true,
          opacity: 0.92,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );
      const bg = new THREE.Mesh(bgGeo, bgMat);
      bg.position.set(0, 0, -82);
      scene.add(bg);

      // Main visible textured cylinder (inside view)
      const cylGeo = track(
        new THREE.CylinderGeometry(
          10.5,
          1.35,
          170,
          isMobile ? 96 : 144,
          isMobile ? 64 : 96,
          true
        )
      );
      cylGeo.rotateX(Math.PI / 2);
      cylGeo.translate(0, 0, -72);

      const cylMat = track(
        new THREE.MeshBasicMaterial({
          map: texture,
          color: 0xffffff,
          side: THREE.BackSide,
          transparent: false,
          opacity: 1,
          blending: THREE.NormalBlending,
          depthWrite: false,
        })
      );
      const cylinder = new THREE.Mesh(cylGeo, cylMat);
      scene.add(cylinder);

      // Thin grid overlay
      const wireGeo = track(
        new THREE.CylinderGeometry(
          10.15,
          1.1,
          168,
          isMobile ? 34 : 46,
          isMobile ? 50 : 72,
          true
        )
      );
      wireGeo.rotateX(Math.PI / 2);
      wireGeo.translate(0, 0, -71);

      const wireMat = track(
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          wireframe: true,
          transparent: true,
          opacity: 0.2,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      const wire = new THREE.Mesh(wireGeo, wireMat);
      scene.add(wire);

      // Vortex rings
      const ringGroup = new THREE.Group();
      scene.add(ringGroup);

      for (let i = 0; i < 34; i += 1) {
        const radius = 0.8 + i * 0.16;
        const z = -18 - i * 1.2;
        const points = [];
        const steps = 140;

        for (let j = 0; j <= steps; j += 1) {
          const a = (j / steps) * Math.PI * 2;
          const wobble =
            Math.sin(a * 5 + i * 0.3) * 0.05 +
            Math.cos(a * 3 - i * 0.2) * 0.03;

          points.push(
            new THREE.Vector3(
              Math.cos(a + i * 0.04) * (radius + wobble),
              Math.sin(a + i * 0.04) * (radius + wobble) * 0.82,
              z
            )
          );
        }

        const lineGeo = track(new THREE.BufferGeometry().setFromPoints(points));
        const lineMat = track(
          new THREE.LineBasicMaterial({
            color: i % 2 === 0 ? 0xf2d2ff : 0xc8f8ff,
            transparent: true,
            opacity: 0.44 - i * 0.007,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        );

        ringGroup.add(new THREE.Line(lineGeo, lineMat));
      }

      // Dark center hole
      const holeGeo = track(new THREE.CircleGeometry(1.0, 72));
      const holeMat = track(
        new THREE.MeshBasicMaterial({
          color: 0x060014,
          transparent: true,
          opacity: 0.96,
          depthWrite: false,
        })
      );
      const hole = new THREE.Mesh(holeGeo, holeMat);
      hole.position.set(0.18, -0.08, -18);
      hole.scale.set(1.24, 0.9, 1);
      scene.add(hole);

      const rimGeo = track(new THREE.TorusGeometry(1.22, 0.08, 10, 96));
      const rimMat = track(
        new THREE.MeshBasicMaterial({
          color: 0xc08bff,
          transparent: true,
          opacity: 0.92,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.position.copy(hole.position);
      rim.scale.copy(hole.scale);
      scene.add(rim);

      let raf = 0;
      const animate = () => {
        pointer.x += (pointer.tx - pointer.x) * 0.04;
        pointer.y += (pointer.ty - pointer.y) * 0.04;

        const t = performance.now() * 0.001;

        texture.offset.y = -t * 0.12;
        texture.offset.x = Math.sin(t * 0.18) * 0.04;
        bgTexture.offset.y = -t * 0.025;
        bgTexture.offset.x = Math.sin(t * 0.08) * 0.01;

        cylinder.rotation.z = t * 0.055;
        wire.rotation.z = -t * 0.03;
        ringGroup.rotation.z = -t * 0.15;

        const pulse = 1 + Math.sin(t * 0.9) * 0.02;
        cylinder.scale.set(pulse, 1 / pulse, 1);

        hole.rotation.z = t * 0.24;
        rim.rotation.z = t * 0.24;
        rim.scale.set(
          1.24 + Math.sin(t * 1.7) * 0.03,
          0.9 + Math.cos(t * 1.5) * 0.02,
          1
        );

        camera.position.x = pointer.x * 0.5 + Math.sin(t * 0.35) * 0.06;
        camera.position.y = -pointer.y * 0.36 + Math.cos(t * 0.28) * 0.05;
        camera.rotation.z = Math.sin(t * 0.18) * 0.018 + pointer.x * 0.022;

        renderer.render(scene, camera);
        raf = requestAnimationFrame(animate);
      };
      animate();

      return () => cancelAnimationFrame(raf);
    }

    let stopAnimation = null;
    loader.load(
      TEXTURE_URL,
      (loaded) => {
        stopAnimation = build(loaded);
      },
      undefined,
      () => {
        stopAnimation = build(makeFallbackTexture());
      }
    );

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

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", onResize);
      if (stopAnimation) stopAnimation();
      for (const item of resources) {
        if (item && typeof item.dispose === "function") item.dispose();
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
    </main>
  );
}
