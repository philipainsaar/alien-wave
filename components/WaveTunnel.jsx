"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const TEXTURE_URL = "/wave-cylinder-texture.jpg";
const MODEL_URL = "/alien-cat.glb";

export default function WaveTunnel() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    let animationFrameId = 0;
    let model = null;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x05091f, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.autoClear = false;
    mount.appendChild(renderer.domElement);

    // Scene 1: full-screen shader tunnel.
    const tunnelScene = new THREE.Scene();
    const tunnelCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // Scene 2: real 3D GLB model.
    const modelScene = new THREE.Scene();
    const modelCamera = new THREE.PerspectiveCamera(
      42,
      mount.clientWidth / mount.clientHeight,
      0.1,
      100
    );

    modelCamera.position.set(0, 0, 5.2);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
    modelScene.add(ambientLight);

    const frontLight = new THREE.DirectionalLight(0xffffff, 2.1);
    frontLight.position.set(2.5, 3.2, 5);
    modelScene.add(frontLight);

    const cyanLight = new THREE.PointLight(0x7cf6ff, 2.2, 10);
    cyanLight.position.set(-2.5, 1.5, 2.5);
    modelScene.add(cyanLight);

    const pinkLight = new THREE.PointLight(0xffa6ff, 1.8, 10);
    pinkLight.position.set(2.5, -1.6, 2.5);
    modelScene.add(pinkLight);

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

    const resources = {
      geometries: [],
      materials: [],
      textures: [],
    };

    function keepGeometry(geometry) {
      resources.geometries.push(geometry);
      return geometry;
    }

    function keepMaterial(material) {
      resources.materials.push(material);
      return material;
    }

    function keepTexture(texture) {
      resources.textures.push(texture);
      return texture;
    }

    function buildTunnel(texture) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      keepTexture(texture);

      const uniforms = {
        uTexture: { value: texture },
        uTime: { value: 0 },
        uAspect: { value: mount.clientWidth / mount.clientHeight },
      };

      const material = keepMaterial(
        new THREE.ShaderMaterial({
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

              // Shader tunnel mapping.
              float tunnelDepth = 1.0 / max(r, 0.065);
              float spin = uTime * 0.075;

              vec2 tunnelUv;
              tunnelUv.x =
                angle / (2.0 * PI) +
                0.5 +
                spin +
                sin(tunnelDepth * 0.12 + uTime * 0.3) * 0.015;
              tunnelUv.y = tunnelDepth * 0.42 - uTime * 0.18;

              // Keep the uploaded texture close to normal.
              vec3 tex = texture2D(uTexture, tunnelUv).rgb;
              tex = saturateColor(tex, 1.08);

              float edgeGlow = smoothstep(0.1, 1.2, r);
              float tunnelShade = mix(0.92, 1.08, edgeGlow);
              vec3 color = tex * tunnelShade;

              // Light grid overlay.
              float rings = lineMask(tunnelDepth + uTime * 0.55, 9.5, 0.023);
              float spokes = lineMask(
                angle / (2.0 * PI) + 0.5 + sin(tunnelDepth * 0.1) * 0.015,
                36.0,
                0.018
              );

              float grid = max(rings * 0.65, spokes * 0.5);
              grid *= smoothstep(0.16, 1.0, r);

              vec3 gridColor = mix(
                vec3(0.72, 1.0, 1.0),
                vec3(1.0, 0.75, 1.0),
                sin(angle * 3.0 + uTime) * 0.5 + 0.5
              );

              color += gridColor * grid * 0.18;

              // Small square node sparkles.
              float nodeX = lineMask(angle / (2.0 * PI) + 0.5, 18.0, 0.025);
              float nodeY = lineMask(tunnelDepth + uTime * 0.5, 5.8, 0.025);
              float nodes = nodeX * nodeY * smoothstep(0.22, 1.15, r);
              color += vec3(1.0, 0.93, 1.0) * nodes * 0.26;

              // White center portal behind the model.
              float hole = 1.0 - smoothstep(0.055, 0.17, r);
              vec3 holeColor = vec3(1.0, 0.98, 0.94);
              color = mix(color, holeColor, hole);

              // Soft bright rim.
              float rim =
                smoothstep(0.12, 0.15, r) *
                (1.0 - smoothstep(0.16, 0.21, r));
              color += vec3(1.0, 0.92, 1.0) * rim * 0.55;

              // Very soft vignette only.
              float vignette = smoothstep(1.45, 0.12, r);
              color *= mix(0.88, 1.04, vignette);

              color = clamp(color, vec3(0.0), vec3(1.0));

              gl_FragColor = vec4(color, 1.0);
            }
          `,
        })
      );

      const geometry = keepGeometry(new THREE.PlaneGeometry(2, 2));
      const mesh = new THREE.Mesh(geometry, material);
      tunnelScene.add(mesh);

      return uniforms;
    }

    let tunnelUniforms = null;

    textureLoader.load(
      TEXTURE_URL,
      (texture) => {
        tunnelUniforms = buildTunnel(texture);
      },
      undefined,
      () => {
        tunnelUniforms = buildTunnel(makeFallbackTexture());
      }
    );

    // Load the GLB in the center.
    const gltfLoader = new GLTFLoader();

    gltfLoader.load(
      MODEL_URL,
      (gltf) => {
        model = gltf.scene;

        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;

        model.position.sub(center);

        // Centered in screen, slightly in front of the white portal.
        model.position.set(0, -0.08, 0);

        // Auto-fit model to center without becoming huge.
        const scale = 1.55 / maxDim;
        model.scale.setScalar(scale);

        model.rotation.set(0, 0, 0);

        model.traverse((child) => {
          if (child.isMesh) {
            child.frustumCulled = false;

            if (child.material) {
              child.material.depthWrite = true;
              child.material.needsUpdate = true;
            }
          }
        });

        modelScene.add(model);
      },
      undefined,
      (error) => {
        console.error("Could not load GLB:", error);
      }
    );

    const onResize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;

      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
      renderer.setSize(width, height);

      modelCamera.aspect = width / height;
      modelCamera.updateProjectionMatrix();

      if (tunnelUniforms) {
        tunnelUniforms.uAspect.value = width / height;
      }
    };

    window.addEventListener("resize", onResize);

    const animate = () => {
      const time = performance.now() * 0.001;

      if (tunnelUniforms) {
        tunnelUniforms.uTime.value = time;
      }

      if (model) {
        model.rotation.y = Math.sin(time * 0.8) * 0.18;
        model.position.y = -0.08 + Math.sin(time * 1.4) * 0.045;
        model.position.x = Math.sin(time * 0.75) * 0.025;
      }

      renderer.clear();
      renderer.render(tunnelScene, tunnelCamera);
      renderer.clearDepth();
      renderer.render(modelScene, modelCamera);

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);

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
    </main>
  );
}
