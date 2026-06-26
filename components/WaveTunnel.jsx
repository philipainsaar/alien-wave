"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

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
    const textureUrl = "/wave-dotted-texture-seamless.jpg";

    function loadTunnelTexture(repeatX, repeatY) {
      const texture = textureLoader.load(textureUrl);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(repeatX, repeatY);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    }

    const outerTexture = loadTunnelTexture(4.6, 15.5);
    const innerTexture = loadTunnelTexture(2.2, 8.5);
    const centerTexture = loadTunnelTexture(1.2, 3.2);

    const outerGeometry = new THREE.CylinderGeometry(
      9.2,
      2.5,
      210,
      isMobile ? 96 : 144,
      isMobile ? 56 : 86,
      true
    );

    outerGeometry.rotateX(Math.PI / 2);
    outerGeometry.translate(0, 0, -86);

    const outerMaterial = new THREE.MeshBasicMaterial({
      map: outerTexture,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const outerTunnel = new THREE.Mesh(outerGeometry, outerMaterial);
    scene.add(outerTunnel);

    const innerGeometry = new THREE.CylinderGeometry(
      7.4,
      1.15,
      196,
      isMobile ? 72 : 112,
      isMobile ? 40 : 64,
      true
    );

    innerGeometry.rotateX(Math.PI / 2);
    innerGeometry.translate(0, 0, -78);

    const innerMaterial = new THREE.MeshBasicMaterial({
      map: innerTexture,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.58,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const innerTunnel = new THREE.Mesh(innerGeometry, innerMaterial);
    scene.add(innerTunnel);

    const centerGeometry = new THREE.CylinderGeometry(
      3.2,
      0.45,
      74,
      isMobile ? 56 : 86,
      isMobile ? 22 : 34,
      true
    );

    centerGeometry.rotateX(Math.PI / 2);
    centerGeometry.translate(0.28, -0.1, -44);

    const centerMaterial = new THREE.MeshBasicMaterial({
      map: centerTexture,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const centerTunnel = new THREE.Mesh(centerGeometry, centerMaterial);
    scene.add(centerTunnel);

    const wireGeometry = new THREE.CylinderGeometry(
      8.65,
      1.25,
      204,
      isMobile ? 34 : 46,
      isMobile ? 34 : 50,
      true
    );

    wireGeometry.rotateX(Math.PI / 2);
    wireGeometry.translate(0, 0, -84);

    const wireMaterial = new THREE.MeshBasicMaterial({
      color: 0xf5d8ff,
      wireframe: true,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const wireTunnel = new THREE.Mesh(wireGeometry, wireMaterial);
    scene.add(wireTunnel);

    const holeGeometry = new THREE.CircleGeometry(1.45, 72);
    const holeMaterial = new THREE.MeshBasicMaterial({
      color: 0x030018,
      transparent: true,
      opacity: 0.94,
      depthWrite: false,
    });

    const hole = new THREE.Mesh(holeGeometry, holeMaterial);
    hole.position.set(0.28, -0.1, -28);
    hole.scale.set(1.35, 0.95, 1);
    scene.add(hole);

    const rimGeometry = new THREE.TorusGeometry(1.72, 0.09, 10, 96);
    const rimMaterial = new THREE.MeshBasicMaterial({
      color: 0xbd65ff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.position.copy(hole.position);
    rim.scale.copy(hole.scale);
    scene.add(rim);

    const ringGroup = new THREE.Group();
    const ringGeometries = [];
    const ringMaterials = [];

    scene.add(ringGroup);

    for (let i = 0; i < 34; i += 1) {
      const radius = 1.0 + i * 0.115;
      const geometry = new THREE.BufferGeometry();
      const points = [];
      const steps = 160;

      for (let j = 0; j <= steps; j += 1) {
        const angle = (j / steps) * Math.PI * 2;

        const wobble =
          Math.sin(angle * 5 + i * 0.38) * 0.035 +
          Math.cos(angle * 3 - i * 0.27) * 0.025;

        points.push(
          new THREE.Vector3(
            Math.cos(angle) * (radius + wobble),
            Math.sin(angle) * (radius + wobble) * 0.75,
            -24 - i * 1.22
          )
        );
      }

      geometry.setFromPoints(points);

      const material = new THREE.LineBasicMaterial({
        color: i % 2 === 0 ? 0xffb6ff : 0xc7fbff,
        transparent: true,
        opacity: 0.38 + (1 - i / 34) * 0.26,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      ringGeometries.push(geometry);
      ringMaterials.push(material);

      ringGroup.add(new THREE.Line(geometry, material));
    }

    const glowGeometry = new THREE.PlaneGeometry(120, 120);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x1f85ff,
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.z = -96;
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

      outerTexture.offset.y = -time * 0.12;
      outerTexture.offset.x = Math.sin(time * 0.18) * 0.045;

      innerTexture.offset.y = -time * 0.22;
      innerTexture.offset.x = Math.sin(time * 0.26) * 0.06;

      centerTexture.offset.y = -time * 0.36;
      centerTexture.offset.x = Math.sin(time * 0.34) * 0.08;

      outerTunnel.rotation.z = time * 0.055;
      innerTunnel.rotation.z = -time * 0.09;
      centerTunnel.rotation.z = time * 0.18;
      wireTunnel.rotation.z = -time * 0.035;

      const pulse = 1 + Math.sin(time * 0.85) * 0.025;

      outerTunnel.scale.set(pulse, 1 / pulse, 1);
      innerTunnel.scale.set(1 / pulse, pulse, 1);
      centerTunnel.scale.set(
        1 + Math.sin(time * 1.2) * 0.04,
        1 + Math.cos(time * 1.1) * 0.04,
        1
      );

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

      outerGeometry.dispose();
      innerGeometry.dispose();
      centerGeometry.dispose();
      wireGeometry.dispose();
      holeGeometry.dispose();
      rimGeometry.dispose();
      glowGeometry.dispose();

      outerMaterial.dispose();
      innerMaterial.dispose();
      centerMaterial.dispose();
      wireMaterial.dispose();
      holeMaterial.dispose();
      rimMaterial.dispose();
      glowMaterial.dispose();

      outerTexture.dispose();
      innerTexture.dispose();
      centerTexture.dispose();

      for (const geometry of ringGeometries) geometry.dispose();
      for (const material of ringMaterials) material.dispose();

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
      <div className="waveTunnelLabel">One Texture Wave Tunnel</div>
    </main>
  );
}
