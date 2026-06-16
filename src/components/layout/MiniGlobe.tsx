"use client";

import { useEffect, useRef } from "react";
import type * as THREE from "three";

type MiniGlobeProps = {
  // "points" → bare point-cloud sphere; "earth" → textured GLTF earth
  variant: "points" | "earth";
  interactive?: boolean;
  spin?: boolean;
  className?: string;
};

// Small self-contained WebGL globe for the TLDR cards. Mirrors the earth setup
// in EarthScrollStage (same GLTF + texture) but trimmed to a tiny spinning
// thumbnail with optional drag-to-rotate + momentum.
export function MiniGlobe({ variant, interactive = false, spin = true, className }: MiniGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let alive = true;
    let cleanup: (() => void) | undefined;

    void (async () => {
      const THREE = await import("three");
      if (!alive) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
      camera.position.set(0, 0, 3.0);

      scene.add(new THREE.AmbientLight(0xffffff, 0.55));
      const sun = new THREE.DirectionalLight(0xfff4e6, 1.3);
      sun.position.set(3, 1.5, 4);
      scene.add(sun);

      const spinner = new THREE.Group();
      spinner.rotation.x = THREE.MathUtils.degToRad(12);
      scene.add(spinner);

      const disposers: Array<() => void> = [];

      const resize = () => {
        const w = canvas.clientWidth || 40;
        const h = canvas.clientHeight || 40;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };

      if (variant === "points") {
        const geo = new THREE.SphereGeometry(1, 46, 30);
        const mat = new THREE.PointsMaterial({
          color: 0xffffff,
          size: 0.03,
          sizeAttenuation: true,
          transparent: true,
          opacity: 0.9,
        });
        spinner.add(new THREE.Points(geo, mat));
        disposers.push(() => { geo.dispose(); mat.dispose(); });
      } else {
        const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
        if (!alive) return;
        new GLTFLoader().load("/earth/scene.gltf", (gltf) => {
          if (!alive) return;
          let foundMesh: THREE.Mesh | null = null;
          gltf.scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh && !foundMesh) foundMesh = child as THREE.Mesh;
          });
          const mesh = foundMesh as THREE.Mesh | null;
          if (!mesh) return;

          gltf.scene.updateWorldMatrix(true, true);
          const geo = mesh.geometry.clone();
          geo.applyMatrix4(mesh.matrixWorld);
          geo.computeBoundingSphere();
          const { center, radius } = geo.boundingSphere!;
          geo.translate(-center.x, -center.y, -center.z);
          geo.scale(1 / radius, 1 / radius, 1 / radius);

          const tex = new THREE.TextureLoader().load("/earth/textures/Material.002_diffuse.jpeg");
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.flipY = false;
          const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0.0 });
          spinner.add(new THREE.Mesh(geo, mat));
          disposers.push(() => { geo.dispose(); mat.dispose(); tex.dispose(); });
        });
      }

      resize();
      window.addEventListener("resize", resize);

      // ── Drag to rotate + momentum ─────────────────────────────
      const drag = { active: false, lastX: 0, lastY: 0, vx: 0, vy: 0, id: -1 };
      const momentum = { x: 0, y: 0 };

      const onDown = (e: PointerEvent) => {
        drag.active = true;
        drag.lastX = e.clientX;
        drag.lastY = e.clientY;
        drag.id = e.pointerId;
        momentum.x = momentum.y = 0;
        canvas.setPointerCapture(e.pointerId);
        e.stopPropagation(); // grabbing the globe shouldn't open the card
      };
      const onMove = (e: PointerEvent) => {
        if (!drag.active || e.pointerId !== drag.id) return;
        const dx = e.clientX - drag.lastX;
        const dy = e.clientY - drag.lastY;
        drag.lastX = e.clientX;
        drag.lastY = e.clientY;
        spinner.rotation.y += dx * 0.01;
        spinner.rotation.x += dy * 0.01;
        drag.vx = dy * 0.01;
        drag.vy = dx * 0.01;
      };
      const onUp = (e: PointerEvent) => {
        if (e.pointerId !== drag.id) return;
        drag.active = false;
        drag.id = -1;
        momentum.x = drag.vx;
        momentum.y = drag.vy;
      };
      if (interactive) {
        canvas.addEventListener("pointerdown", onDown);
        canvas.addEventListener("pointermove", onMove);
        canvas.addEventListener("pointerup", onUp);
        canvas.addEventListener("pointercancel", onUp);
      }

      const clock = new THREE.Clock();
      let raf = 0;
      const tick = () => {
        const dt = clock.getDelta();
        if (!drag.active) {
          spinner.rotation.y += momentum.y;
          spinner.rotation.x += momentum.x;
          momentum.x *= 0.94;
          momentum.y *= 0.94;
          if (Math.abs(momentum.x) < 1e-4) momentum.x = 0;
          if (Math.abs(momentum.y) < 1e-4) momentum.y = 0;
          if (spin) spinner.rotation.y += 0.15 * dt; // idle spin
        }
        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      };
      if (interactive || spin) {
        // Needs a live loop (idle spin and/or drag momentum)
        raf = requestAnimationFrame(tick);
      } else {
        // Fully static — render once now, and again after async geometry lands
        renderer.render(scene, camera);
        const settle = setTimeout(() => alive && renderer.render(scene, camera), 60);
        const prevCleanupHook = () => clearTimeout(settle);
        disposers.push(prevCleanupHook);
      }

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        if (interactive) {
          canvas.removeEventListener("pointerdown", onDown);
          canvas.removeEventListener("pointermove", onMove);
          canvas.removeEventListener("pointerup", onUp);
          canvas.removeEventListener("pointercancel", onUp);
        }
        disposers.forEach((d) => d());
        renderer.dispose();
      };
    })();

    return () => {
      alive = false;
      cleanup?.();
    };
  }, [variant, interactive, spin]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        touchAction: "none",
        pointerEvents: interactive ? "auto" : "none",
        cursor: interactive ? "grab" : "default",
      }}
    />
  );
}
