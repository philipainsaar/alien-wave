"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const TEXTURE_URL = "/wave-cylinder-texture.jpg";

export default function WaveTunnel() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    let animationFrameId = 0;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x05091f, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const textureLoader = new THREE.TextureLoader();

    function makeFallbackTexture() {
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 1024;

      const ctx = canvas.getContext("2d");
      const gradient = ctx.createLinearGradient(0, 0, 1024, 1024);
      gradient.addColorStop(0, "#f2c6ff");
      gradient.addColorStop(0.35, "#9fdcff");
      gradient.addColorStop(0.7, "#ffd6f6");
      gradient.addColorStop(1, "#8eeaff");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1024, 1024);

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.colorSpace = THREE.SRGBColorSpace;

      return texture;
    }

    function build(texture) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;

      const uniforms = {
        uTexture: { value: texture },
        uTime: { value: 0 },
        uAspect: { value: mount.clientWidth / mount.clientHeight },
      };

      const material = new THREE.ShaderMaterial({
        uniforms,
        depthWrite: false,
        depthTest: false,
        vertexShader: `
          varying vec2 vUv;

          void main() {
            vUv = uv;
            gl_Position = vec4(position.xy, 0.0, 1.0);
          }
        `,
        fragmentShader: `
          precision highp float;

          uniform sampler2D uTexture;
          uniform float uTime;
          uniform float uAspect;

          varying vec2 vUv;

          const float PI = 3.141592653589793;

          float lineMask(float value, float count, float width) {
            float grid = abs(fract(value * count) - 0.5);
            return 1.0 - smoothstep(width, width + 0.008, grid);
          }

          vec3 saturateColor(vec3 color, float amount) {
            float gray = dot(color, vec3(0.299, 0.587, 0.114));
            return mix(vec3(gray), color, amount);
          }

          void main() {
            vec2 p = vUv * 2.0 - 1.0;
            p.x *= uAspect;

            float r = length(p);
            float angle = atan(p.y, p.x);

            // Tunnel coordinates. This is the cylinder illusion.
            float tunnelDepth = 1.0 / max(r, 0.065);
            float spin = uTime * 0.075;

            vec2 tunnelUv;
            tunnelUv.x = angle / (2.0 * PI) + 0.5 + spin + sin(tunnelDepth * 0.12 + uTime * 0.3) * 0.015;
            tunnelUv.y = tunnelDepth * 0.42 - uTime * 0.18;

            // Main texture. This keeps the uploaded JPG close to its normal colors.
            vec3 tex = texture2D(uTexture, tunnelUv).rgb;

            // Very light saturation only, no strong darkening.
            tex = saturateColor(tex, 1.08);

            // Gentle tunnel depth, but keep the texture visible and bright.
            float edgeGlow = smoothstep(0.1, 1.2, r);
            float tunnelShade = mix(0.92, 1.08, edgeGlow);
            vec3 color = tex * tunnelShade;

            // Grid display overlay: rings + radial lines.
            float rings = lineMask(tunnelDepth + uTime * 0.55, 9.5, 0.023);
            float spokes = lineMask(angle / (2.0 * PI) + 0.5 + sin(tunnelDepth * 0.1) * 0.015, 36.0, 0.018);

            float grid = max(rings * 0.65, spokes * 0.5);
            grid *= smoothstep(0.16, 1.0, r);

            vec3 gridColor = mix(vec3(0.72, 1.0, 1.0), vec3(1.0, 0.75, 1.0), sin(angle * 3.0 + uTime) * 0.5 + 0.5);
            color += gridColor * grid * 0.18;

            // Small square node sparkle pattern, placed on the grid.
            float nodeX = lineMask(angle / (2.0 * PI) + 0.5, 18.0, 0.025);
            float nodeY = lineMask(tunnelDepth + uTime * 0.5, 5.8, 0.025);
            float nodes = nodeX * nodeY * smoothstep(0.22, 1.15, r);
            color += vec3(1.0, 0.93, 1.0) * nodes * 0.26;

            // Center black hole.
            float hole = 1.0 - smoothstep(0.055, 0.17, r);
            vec3 holeColor = vec3(0.005, 0.0, 0.035);
            color = mix(color, holeColor, hole);

            // Purple rim around the center.
            float rim = smoothstep(0.12, 0.15, r) * (1.0 - smoothstep(0.16, 0.21, r));
            color += vec3(0.55, 0.34, 1.0) * rim * 0.65;

            // Very soft vignette only. Texture stays close to normal.
            float vignette = smoothstep(1.45, 0.12, r);
            color *= mix(0.88, 1.04, vignette);

            // Keep natural brightness without crushing the whites.
            color = clamp(color, vec3(0.0), vec3(1.0));

            gl_FragColor = vec4(color, 1.0);
          }
        `,
      });

      const geometry = new THREE.PlaneGeometry(2, 2);
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      const animate = () => {
        uniforms.uTime.value = performance.now() * 0.001;

        renderer.render(scene, camera);
        animationFrameId = requestAnimationFrame(animate);
      };

      animate();

      return () => {
        geometry.dispose();
        material.dispose();
        texture.dispose();
      };
    }

    let cleanup = () => {};

    textureLoader.load(
      TEXTURE_URL,
      (texture) => {
        cleanup = build(texture);
      },
      undefined,
      () => {
        cleanup = build(makeFallbackTexture());
      }
    );

    const onResize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;

      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
      renderer.setSize(width, height);

      const mesh = scene.children[0];
      if (mesh?.material?.uniforms?.uAspect) {
        mesh.material.uniforms.uAspect.value = width / height;
      }
    };

    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", onResize);
      cleanup();

      renderer.dispose();

      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <main className="waveTunnelPage">
      <div ref={mountRef} className="waveTunnelCanvas" />
    </main>
  );
}
