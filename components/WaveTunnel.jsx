"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const TEXTURE_URL = "/wave-dotted-texture-seamless.jpg";

export default function WaveTunnel() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const isMobile = window.innerWidth < 768;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isMobile,
      alpha: true,
      powerPreference: "high-performance",
    });

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, isMobile ? 1.15 : 1.6)
    );
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      72,
      mount.clientWidth / mount.clientHeight,
      0.1,
      500
    );

    camera.position.set(0, 0, 12);

    const textureLoader = new THREE.TextureLoader();

    function makeTexture(repeatX, repeatY) {
      const texture = textureLoader.load(TEXTURE_URL);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(repeatX, repeatY);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    }

    const tunnelTexture = makeTexture(3.2, 10.0);
    const innerTexture = makeTexture(1.7, 6.0);
    const floorTexture = makeTexture(2.2, 4.0);

    // Big near tunnel shell.
    // This starts close to the camera so the texture reaches the front of the screen.
    const tunnelGeometry = new THREE.CylinderGeometry(
      15.0,
      1.7,
      240,
      isMobile ? 96 : 144,
      isMobile ? 64 : 96,
      true
    );

    tunnelGeometry.rotateX(Math.PI / 2);
    tunnelGeometry.translate(0, 0, -72);

    const tunnelMaterial = new THREE.MeshBasicMaterial({
      map: tunnelTexture,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.92,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });

    const tunnel = new THREE.Mesh(tunnelGeometry, tunnelMaterial);
    scene.add(tunnel);

    // Brighter inner tunnel using the same texture.
    const innerGeometry = new THREE.CylinderGeometry(
      8.0,
      0.65,
      150,
      isMobile ? 72 : 112,
      isMobile ? 42 : 72,
      true
    );

    innerGeometry.rotateX(Math.PI / 2);
    innerGeometry.translate(0, 0, -60);

    const innerMaterial = new THREE.MeshBasicMaterial({
      map: innerTexture,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.64,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const innerTunnel = new THREE.Mesh(innerGeometry, innerMaterial);
    scene.add(innerTunnel);

    // A front-facing textured plane behind the vortex, still using the same JPG.
    // This makes sure the image is visible even outside the cylinder edges.
    const backgroundPlaneGeometry = new THREE.PlaneGeometry(42, 78);
    const backgroundPlaneMaterial = new THREE.MeshBasicMaterial({
      map: floorTexture,
      transparent: true,
      opacity: 0.45,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });

    const backgroundPlane = new THREE.Mesh(
      backgroundPlaneGeometry,
      backgroundPlaneMaterial
    );

    backgroundPlane.position.set(0, 0, -92);
    scene.add(backgroundPlane);

    // Wireframe tunnel overlay.
    const wireGeometry = new THREE.CylinderGeometry(
      14.2,
      1.25,
      232,
      isMobile ? 34 : 46,
      isMobile ? 44 : 64,
      true
    );

    wireGeometry.rotateX(Math.PI / 2);
    wireGeometry.translate(0, 0, -70);

    const wireMaterial = new THREE.MeshBasicMaterial({
      color: 0xf8d9ff,
      wireframe: true,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const wireTunnel = new THREE.Mesh(wireGeometry, wireMaterial);
    scene.add(wireTunnel);

    // Vortex rings near center.
    const ringGroup = new THREE.Group();
    const ringGeometries = [];
    const ringMaterials = [];

    scene.add(ringGroup);

    for (let i = 0; i < 46; i += 1) {
      const radius = 0.55 + i * 0.145;
      const geometry = new THREE.BufferGeometry();
      const points = [];
      const steps = 170;

      for (let j = 0; j <= steps; j += 1) {
        const angle = (j / steps) * Math.PI * 2;

        const wobble =
          Math.sin(angle * 5 + i * 0.38) * 0.045 +
          Math.cos(angle * 3 - i * 0.27) * 0.035;

        points.push(
          new THREE.Vector3(
            Math.cos(angle) * (radius + wobble),
            Math.sin(angle) * (radius + wobble) * 0.78,
            -16 - i * 1.18
          )
        );
      }

      geometry.setFromPoints(points);

      const material = new THREE.LineBasicMaterial({
        color: i % 2 === 0 ? 0xffb6ff : 0xc7fbff,
        transparent: true,
        opacity: 0.58 - i * 0.006,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      ringGeometries.push(geometry);
      ringMaterials.push(material);

      ringGroup.add(new THREE.Line(geometry, material));
    }

    // Dark center hole.
    const holeGeometry = new THREE.CircleGeometry(1.05, 72);
    const holeMaterial = new THREE.MeshBasicMaterial({
      color: 0x020014,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });

    const hole = new THREE.Mesh(holeGeometry, holeMaterial);
    hole.position.set(0.2, -0.08, -16);
    hole.scale.set(1.34, 0.92, 1);
    scene.add(hole);

    const rimGeometry = new THREE.TorusGeometry(1.28, 0.08, 10, 96);
    const rimMaterial = new THREE.MeshBasicMaterial({
      color: 0xbd65ff,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.position.copy(hole.position);
    rim.scale.copy(hole.scale);
    scene.add(rim);

    const glowGeometry = new THREE.PlaneGeometry(70, 70);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x1f85ff,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.z = -95;
    scene.add(glow);

    const pointer = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
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

      tunnelTexture.offset.y = -time * 0.1;
      tunnelTexture.offset.x = Math.sin(time * 0.18) * 0.04;

      innerTexture.offset.y = -time * 0.18;
      innerTexture.offset.x = Math.sin(time * 0.25) * 0.055;

      floorTexture.offset.y = -time * 0.035;
      floorTexture.offset.x = Math.sin(time * 0.12) * 0.025;

      tunnel.rotation.z = time * 0.035;
      innerTunnel.rotation.z = -time * 0.075;
      wireTunnel.rotation.z = -time * 0.03;

      const pulse = 1 + Math.sin(time * 0.85) * 0.025;

      tunnel.scale.set(pulse, 1 / pulse, 1);
      innerTunnel.scale.set(1 / pulse, pulse, 1);

      ringGroup.rotation.z = -time * 0.18;

      hole.rotation.z = time * 0.26;
      rim.rotation.z = time * 0.26;
      rim.scale.set(
        1.34 + Math.sin(time * 1.7) * 0.04,
        0.92 + Math.cos(time * 1.5) * 0.03,
        1
      );

      camera.position.x = pointer.x * 0.72 + Math.sin(time * 0.36) * 0.08;
      camera.position.y = -pointer.y * 0.52 + Math.cos(time * 0.31) * 0.06;
      camera.rotation.z = Math.sin(time * 0.2) * 0.025 + pointer.x * 0.035;

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
        Math.min(
          window.devicePixelRatio || 1,
          window.innerWidth < 768 ? 1.15 : 1.6
        )
      );
      renderer.setSize(width, height);
    };

    window.addEventListener("resize", onResize);

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);

      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", onResize);

      tunnelGeometry.dispose();
      innerGeometry.dispose();
      backgroundPlaneGeometry.dispose();
      wireGeometry.dispose();
      holeGeometry.dispose();
      rimGeometry.dispose();
      glowGeometry.dispose();

      tunnelMaterial.dispose();
      innerMaterial.dispose();
      backgroundPlaneMaterial.dispose();
      wireMaterial.dispose();
      holeMaterial.dispose();
      rimMaterial.dispose();
      glowMaterial.dispose();

      tunnelTexture.dispose();
      innerTexture.dispose();
      floorTexture.dispose();

      for (const geometry of ringGeometries) geometry.dispose();
      for (const material of ringMaterials) material.dispose();

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
        backgroundImage: `
          radial-gradient(circle at 50% 38%, rgba(0, 255, 225, 0.2), transparent 42%),
          radial-gradient(circle at 25% 80%, rgba(255, 112, 255, 0.2), transparent 38%),
          radial-gradient(circle at 82% 72%, rgba(0, 110, 255, 0.24), transparent 38%),
          url("${TEXTURE_URL}")
        `,
        backgroundSize: "cover, cover, cover, 900px 900px",
        backgroundRepeat: "no-repeat, no-repeat, no-repeat, repeat",
        backgroundPosition: "center, center, center, center",
      }}
    >
      <div
        ref={mountRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      />

      <div
        style={{
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at center, transparent 42%, rgba(0, 0, 0, 0.34) 100%)",
          mixBlendMode: "multiply",
        }}
      />
    </main>
  );
}
