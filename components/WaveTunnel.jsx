"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const TEXTURE_URL = "/wave-dotted-texture-seamless.jpg";

function makeFallbackTexture() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, "#0837ff");
  gradient.addColorStop(0.35, "#00e2d8");
  gradient.addColorStop(0.7, "#d86cff");
  gradient.addColorStop(1, "#07103d");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = "#f3d9ff";
  ctx.lineWidth = 2;

  for (let y = -40; y < size + 40; y += 38) {
    ctx.beginPath();

    for (let x = -20; x < size + 20; x += 10) {
      const yy = y + Math.sin((x / size) * Math.PI * 6 + y * 0.03) * 16;

      if (x === -20) {
        ctx.moveTo(x, yy);
      } else {
        ctx.lineTo(x, yy);
      }

      if (x % 70 === 0) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x - 3, yy - 3, 6, 6);
      }
    }

    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function cloneRepeatingTexture(baseTexture, repeatX, repeatY) {
  const texture = baseTexture.clone();

  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  return texture;
}

function resizePlaneToCamera(plane, camera, planeZ) {
  const distance = Math.abs(camera.position.z - planeZ);
  const height =
    2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5) * distance;
  const width = height * camera.aspect;

  plane.scale.set(width * 1.08, height * 1.08, 1);
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
      alpha: true,
      powerPreference: "high-performance",
    });

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, isMobile ? 1.15 : 1.6)
    );
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      72,
      mount.clientWidth / mount.clientHeight,
      0.1,
      500
    );

    camera.position.set(0, 0, 10);

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

    const addGeometry = (geometry) => {
      resources.geometries.push(geometry);
      return geometry;
    };

    const addMaterial = (material) => {
      resources.materials.push(material);
      return material;
    };

    const addTexture = (texture) => {
      resources.textures.push(texture);
      return texture;
    };

    const onPointerMove = (event) => {
      pointer.targetX = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.targetY = (event.clientY / window.innerHeight - 0.5) * 2;
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const textureLoader = new THREE.TextureLoader();

    function buildScene(baseTexture) {
      if (disposed) return;

      const backgroundTexture = addTexture(cloneRepeatingTexture(baseTexture, 1.35, 2.1));
      const tunnelTexture = addTexture(cloneRepeatingTexture(baseTexture, 3.0, 8.0));
      const innerTexture = addTexture(cloneRepeatingTexture(baseTexture, 1.7, 5.5));
      const centerTexture = addTexture(cloneRepeatingTexture(baseTexture, 1.1, 2.8));

      // Full-screen Three.js background plane, using the same JPG.
      const backgroundPlaneZ = -36;
      const backgroundPlaneGeometry = addGeometry(new THREE.PlaneGeometry(1, 1));
      const backgroundPlaneMaterial = addMaterial(
        new THREE.MeshBasicMaterial({
          map: backgroundTexture,
          transparent: true,
          opacity: 0.92,
          depthWrite: false,
          depthTest: false,
          side: THREE.DoubleSide,
        })
      );

      const backgroundPlane = new THREE.Mesh(
        backgroundPlaneGeometry,
        backgroundPlaneMaterial
      );

      backgroundPlane.position.set(0, 0, backgroundPlaneZ);
      backgroundPlane.renderOrder = -100;
      resizePlaneToCamera(backgroundPlane, camera, backgroundPlaneZ);
      scene.add(backgroundPlane);

      // Main tunnel. Near end is close to the camera, so it fills the front of the screen.
      const tunnelGeometry = addGeometry(
        new THREE.CylinderGeometry(
          18.5,
          1.3,
          220,
          isMobile ? 96 : 144,
          isMobile ? 64 : 96,
          true
        )
      );

      tunnelGeometry.rotateX(Math.PI / 2);
      tunnelGeometry.translate(0, 0, -103);

      const tunnelMaterial = addMaterial(
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          map: tunnelTexture,
          side: THREE.BackSide,
          transparent: true,
          opacity: 0.98,
          blending: THREE.NormalBlending,
          depthWrite: false,
        })
      );

      const tunnel = new THREE.Mesh(tunnelGeometry, tunnelMaterial);
      scene.add(tunnel);

      // Second tunnel layer for movement depth.
      const innerGeometry = addGeometry(
        new THREE.CylinderGeometry(
          9.0,
          0.55,
          160,
          isMobile ? 72 : 112,
          isMobile ? 42 : 72,
          true
        )
      );

      innerGeometry.rotateX(Math.PI / 2);
      innerGeometry.translate(0, 0, -76);

      const innerMaterial = addMaterial(
        new THREE.MeshBasicMaterial({
          color: 0xbff7ff,
          map: innerTexture,
          side: THREE.BackSide,
          transparent: true,
          opacity: 0.62,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );

      const innerTunnel = new THREE.Mesh(innerGeometry, innerMaterial);
      scene.add(innerTunnel);

      // Wireframe overlay, no extra texture needed.
      const wireGeometry = addGeometry(
        new THREE.CylinderGeometry(
          18.2,
          1.0,
          216,
          isMobile ? 34 : 46,
          isMobile ? 44 : 64,
          true
        )
      );

      wireGeometry.rotateX(Math.PI / 2);
      wireGeometry.translate(0, 0, -101);

      const wireMaterial = addMaterial(
        new THREE.MeshBasicMaterial({
          color: 0xffd9ff,
          wireframe: true,
          transparent: true,
          opacity: 0.26,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );

      const wireTunnel = new THREE.Mesh(wireGeometry, wireMaterial);
      scene.add(wireTunnel);

      // Center texture funnel.
      const centerGeometry = addGeometry(
        new THREE.CylinderGeometry(
          4.0,
          0.42,
          76,
          isMobile ? 56 : 86,
          isMobile ? 22 : 34,
          true
        )
      );

      centerGeometry.rotateX(Math.PI / 2);
      centerGeometry.translate(0.18, -0.08, -43);

      const centerMaterial = addMaterial(
        new THREE.MeshBasicMaterial({
          color: 0xd9d2ff,
          map: centerTexture,
          side: THREE.BackSide,
          transparent: true,
          opacity: 0.72,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );

      const centerTunnel = new THREE.Mesh(centerGeometry, centerMaterial);
      scene.add(centerTunnel);

      // Vortex rings.
      const ringGroup = new THREE.Group();
      scene.add(ringGroup);

      for (let i = 0; i < 46; i += 1) {
        const radius = 0.55 + i * 0.145;
        const geometry = addGeometry(new THREE.BufferGeometry());
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

        const material = addMaterial(
          new THREE.LineBasicMaterial({
            color: i % 2 === 0 ? 0xffb6ff : 0xc7fbff,
            transparent: true,
            opacity: Math.max(0.12, 0.58 - i * 0.006),
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        );

        ringGroup.add(new THREE.Line(geometry, material));
      }

      const holeGeometry = addGeometry(new THREE.CircleGeometry(1.05, 72));
      const holeMaterial = addMaterial(
        new THREE.MeshBasicMaterial({
          color: 0x020014,
          transparent: true,
          opacity: 0.92,
          depthWrite: false,
        })
      );

      const hole = new THREE.Mesh(holeGeometry, holeMaterial);
      hole.position.set(0.2, -0.08, -16);
      hole.scale.set(1.34, 0.92, 1);
      scene.add(hole);

      const rimGeometry = addGeometry(new THREE.TorusGeometry(1.28, 0.08, 10, 96));
      const rimMaterial = addMaterial(
        new THREE.MeshBasicMaterial({
          color: 0xbd65ff,
          transparent: true,
          opacity: 0.92,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );

      const rim = new THREE.Mesh(rimGeometry, rimMaterial);
      rim.position.copy(hole.position);
      rim.scale.copy(hole.scale);
      scene.add(rim);

      const glowGeometry = addGeometry(new THREE.PlaneGeometry(80, 80));
      const glowMaterial = addMaterial(
        new THREE.MeshBasicMaterial({
          color: 0x1f85ff,
          transparent: true,
          opacity: 0.14,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );

      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.position.z = -90;
      scene.add(glow);

      const animate = () => {
        if (disposed) return;

        const time = performance.now() * 0.001;

        pointer.x += (pointer.targetX - pointer.x) * 0.045;
        pointer.y += (pointer.targetY - pointer.y) * 0.045;

        backgroundTexture.offset.y = -time * 0.025;
        backgroundTexture.offset.x = Math.sin(time * 0.12) * 0.018;

        tunnelTexture.offset.y = -time * 0.1;
        tunnelTexture.offset.x = Math.sin(time * 0.18) * 0.04;

        innerTexture.offset.y = -time * 0.18;
        innerTexture.offset.x = Math.sin(time * 0.25) * 0.055;

        centerTexture.offset.y = -time * 0.32;
        centerTexture.offset.x = Math.sin(time * 0.3) * 0.06;

        tunnel.rotation.z = time * 0.035;
        innerTunnel.rotation.z = -time * 0.075;
        centerTunnel.rotation.z = time * 0.16;
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

      animate();
    }

    textureLoader.load(
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

    const onResize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      for (const object of scene.children) {
        if (object.isMesh && object.renderOrder === -100) {
          resizePlaneToCamera(object, camera, object.position.z);
        }
      }

      renderer.setPixelRatio(
        Math.min(
          window.devicePixelRatio || 1,
          window.innerWidth < 768 ? 1.15 : 1.6
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
    <main className="waveTunnelPage">
      <div ref={mountRef} className="waveTunnelCanvas" />
      <div className="waveTunnelShade" />
    </main>
  );
}
