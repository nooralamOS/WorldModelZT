'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { DialRoot, useDialKit } from 'dialkit';
import 'dialkit/styles.css';

const STORY = {
  scrollDistance: '+=300%',
  scrub: true,
  earthMove:    { at: 0,    duration: 0.50, ease: 'power2.inOut' },
  titleReveal:  { at: 0.24, duration: 0.38, ease: 'power2.out'   },
  titleShrink:  { at: 0.56, duration: 0.33, ease: 'power2.inOut' },
  articleIn:    { at: 0.72, duration: 0.28, ease: 'power2.out'   },
  // World-space keyframes (scale = earthScroll.scale / initialScale)
  earthTune: [
    { at: 0.56, x: -2.97, y: -0.05, scale: 0.15 },
    { at: 0.89, x: -1.32, y:  1.18, scale: 0.07 },
  ],
};

const SPHERE_RADIUS = 1.0;
const MASK_SZ = 512;
const DRAG_SENS = 0.005;
const MOMENTUM_FRICTION = 0.95;
const MAX_FLING = 9.0;
const IDLE_SPIN = 0.08;
const BRUSH_RADIUS = 26;
const MASK_DECAY = 0.014;

const VERT_PTS = /* glsl */`
  uniform float uScale;
  varying vec2  vUv;
  void main() {
    vUv = uv;
    gl_PointSize = max(1.0, 1.2 + 3.5 * uScale);
    gl_Position  = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const FRAG_PTS = /* glsl */`
  uniform sampler2D uMask;
  varying vec2 vUv;
  void main() {
    float mask = texture2D(uMask, vUv).r;
    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0 - mask);
  }
`;
type EarthParams = {
  startX: number; startY: number; startScale: number;
  inOX: number; inOY: number; inOScale: number;
  onOX: number; onOY: number; onOScaleMult: number;
  finalX: number; finalY: number; finalScaleMult: number;
};

export function EarthScrollStage({ children, nav }: { children: ReactNode; nav?: ReactNode }) {
  const canvasRef         = useRef<HTMLCanvasElement>(null);
  const heroInnerRef      = useRef<HTMLDivElement>(null);
  const titleWrapRef      = useRef<HTMLDivElement>(null);
  const oTargetRef        = useRef<HTMLSpanElement>(null);
  const scrollCueRef      = useRef<HTMLDivElement>(null);
  const articleContentRef = useRef<HTMLDivElement>(null);
  const posReadoutRef     = useRef<HTMLSpanElement>(null);

  // Bridge: live params readable inside the Three.js effect closure
  const earthParamsRef = useRef<EarthParams>({
    startX: 0, startY: 0, startScale: 1,
    inOX: 0, inOY: 0, inOScale: 0.15,
    onOX: 0, onOY: 0, onOScaleMult: 1,
    finalX: 0, finalY: 0, finalScaleMult: 1,
  });
  const refreshScrollRef = useRef<(() => void) | null>(null);
  const rebuildStoryRef    = useRef<((remeasure?: boolean) => void) | null>(null);

  // ── DialKit ────────────────────────────────────────────────
  const params = useDialKit('Earth', {
    start: {
      x:     [0,    -4,   4,   0.01],
      y:     [0,    -3,   3,   0.01],
      scale: [1.0,  0.01, 4,   0.01],
    },
    // Fine-tune offset from DOM "o" center (all scroll phases while on hero)
    inO: {
      x:     [0, -2, 2, 0.01],
      y:     [0, -2, 2, 0.01],
      scale: [0.15,  0.05, 1, 0.01],
    },
    // Fine-tune while title shrinks (scroll ~0.55–0.91, e.g. 0.57)
    onO: {
      x:     [0, -2, 2, 0.01],
      y:     [0, -2, 2, 0.01],
      scale: [1.0, 0.25, 2.5, 0.01],
    },
    // Fine-tune after scroll story — article header "o"
    final: {
      x:     [0, -2, 2, 0.01],
      y:     [0, -2, 2, 0.01],
      scale: [1.0, 0.25, 2.5, 0.01],
    },
    logValues: { type: 'action', label: 'Log to console' },
  }, {
    onAction: (action: string) => {
      if (action === 'logValues') {
        const p = earthParamsRef.current;
        console.log(
          '%c[Earth params]',
          'font-weight:bold;color:#4a9eff',
          `\nstart.x:         ${p.startX.toFixed(3)}` +
          `\nstart.y:         ${p.startY.toFixed(3)}` +
          `\nstart.scale:     ${p.startScale.toFixed(3)}` +
          `\ninO.x:           ${p.inOX.toFixed(3)}` +
          `\ninO.y:           ${p.inOY.toFixed(3)}` +
          `\ninO.scale:       ${p.inOScale.toFixed(3)}` +
          `\nonO.x:           ${p.onOX.toFixed(3)}  (fine-tune @ ~0.57)` +
          `\nonO.y:           ${p.onOY.toFixed(3)}` +
          `\nonO.scaleMult:   ${p.onOScaleMult.toFixed(3)}` +
          `\nfinal.x:         ${p.finalX.toFixed(3)}  (article header)` +
          `\nfinal.y:         ${p.finalY.toFixed(3)}` +
          `\nfinal.scaleMult: ${p.finalScaleMult.toFixed(3)}`
        );
      }
    },
  });

  // Sync DialKit → ref and rebuild GSAP earth track
  useEffect(() => {
    earthParamsRef.current = {
      startX:         (params as any).start.x,
      startY:         (params as any).start.y,
      startScale:     (params as any).start.scale,
      inOX:           (params as any).inO.x,
      inOY:           (params as any).inO.y,
      inOScale:       (params as any).inO.scale,
      onOX:           (params as any).onO.x,
      onOY:           (params as any).onO.y,
      onOScaleMult:   (params as any).onO.scale,
      finalX:         (params as any).final.x,
      finalY:         (params as any).final.y,
      finalScaleMult: (params as any).final.scale,
    };
    rebuildStoryRef.current?.(false);
    refreshScrollRef.current?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => {
    let alive = true;
    let teardown: (() => void) | undefined;

    void (async () => {
      const [THREE, { GLTFLoader }, gsapMod, { ScrollTrigger }] = await Promise.all([
        import('three'),
        import('three/addons/loaders/GLTFLoader.js'),
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      if (!alive) return;

      const gsap = gsapMod.default;
      gsap.registerPlugin(ScrollTrigger);
      refreshScrollRef.current = () => ScrollTrigger.refresh();

      const canvas         = canvasRef.current!;
      const heroInner      = heroInnerRef.current!;
      const titleWrap      = titleWrapRef.current!;
      const oTarget        = oTargetRef.current!;
      const scrollCue      = scrollCueRef.current!;
      const articleContent = articleContentRef.current!;

    // ── Renderer ──────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    // ── Scene / Camera ─────────────────────────────────────────
    // Orthographic eliminates off-axis sphere distortion (perspective would stretch
    // the globe into an ellipse whenever it's not centered in the viewport).
    const scene  = new THREE.Scene();
    const halfH  = Math.tan((45 / 2) * Math.PI / 180) * 5; // matches old perspective viewport scale
    const camera = new THREE.OrthographicCamera(
      -(window.innerWidth / window.innerHeight) * halfH,
       (window.innerWidth / window.innerHeight) * halfH,
      halfH, -halfH, 0.1, 100
    );
    camera.position.set(0, 0, 5);

    // ── Lighting (Sketchfab-style: sun + soft fill) ─────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const sun = new THREE.DirectionalLight(0xfff4e6, 1.4);
    sun.position.set(4, 1.5, 5);
    scene.add(sun);
    scene.add(new THREE.HemisphereLight(0x8ec8ff, 0x0a0a18, 0.25));

    // ── Paint mask (UV-space, 512×512) ─────────────────────────
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = maskCanvas.height = MASK_SZ;
    const maskCtx = maskCanvas.getContext('2d')!;
    maskCtx.fillStyle = '#000';
    maskCtx.fillRect(0, 0, MASK_SZ, MASK_SZ);
    const maskTex = new THREE.CanvasTexture(maskCanvas);

    // earthScroll → position/scale  |  earthDrag → drag rotation  |  earthOrient → geometry holder
    const earthScroll  = new THREE.Group();
    const earthDrag    = new THREE.Group();
    const earthOrient  = new THREE.Group();
    earthDrag.add(earthOrient);
    earthScroll.add(earthDrag);
    scene.add(earthScroll);

    let earthMesh: THREE.Mesh | null = null;
    let scrollTimeline: gsap.core.Timeline | null = null;
    let scrollTriggers: ScrollTrigger[] = [];
    // Cached on initial build and resize — never re-measured mid-scroll
    let measuredTargets: { oWorld: THREE.Vector3; earthOScale: number; titleShrink: { scale: number; dx: number; dy: number; earthFinalScale: number }; oFinalWorld: THREE.Vector3 } | null = null;

    let scrollPastHero = false;
    let titlePlacedInArticle = false;

    const ARTICLE_TITLE_CLASSES = [
      'font-display', 'font-semibold', 'leading-[1.05]', 'tracking-[-0.03em]', 'text-ink',
    ] as const;

    const restoreTitleToHero = () => {
      const articleTitle = document.getElementById('article-title') as HTMLElement | null;
      const h1 = titleWrap.querySelector('h1') as HTMLElement | null;

      if (articleTitle) articleTitle.style.display = '';
      if (titleWrap.parentElement !== heroInner) heroInner.appendChild(titleWrap);

      if (h1) {
        h1.classList.add('earth-hero-title');
        h1.classList.remove(...ARTICLE_TITLE_CLASSES);
        h1.style.fontSize = '';
      }

      gsap.set(titleWrap, {
        y: 60, opacity: 0, textAlign: 'center',
        clearProps: 'margin,padding,width,position,left,top,zIndex',
      });
      gsap.set(oTarget, { visibility: 'hidden' });
      titlePlacedInArticle = false;
    };

    const setArticleHandoff = (active: boolean) => {
      scrollPastHero = active;
      canvas.style.opacity = active ? '0' : '1';

      if (active && !titlePlacedInArticle) {
        const articleTitle = document.getElementById('article-title') as HTMLElement | null;
        const header = articleTitle?.closest('header');
        const h1 = titleWrap.querySelector('h1') as HTMLElement | null;
        if (!header || !articleTitle || !h1) return;

        const anchorFs = parseFloat(getComputedStyle(articleTitle).fontSize);

        header.insertBefore(titleWrap, articleTitle);
        articleTitle.style.display = 'none';

        h1.classList.remove('earth-hero-title');
        h1.classList.add(...ARTICLE_TITLE_CLASSES);
        h1.style.fontSize = `${anchorFs}px`;

        gsap.set(titleWrap, {
          clearProps: 'transform',
          opacity: 1,
          textAlign: 'left',
          margin: 0,
          padding: 0,
        });
        gsap.set(oTarget, {
          visibility: 'visible',
          clearProps: 'webkitTextStrokeColor,webkitTextStrokeWidth,color',
        });
        titlePlacedInArticle = true;
      } else if (!active && titlePlacedInArticle) {
        restoreTitleToHero();
      }
    };

    const initialScale = (halfH * 0.65) / SPHERE_RADIUS;
    const flyEnd = STORY.earthMove.at + STORY.earthMove.duration;

    const projectWorldY = (wy: number) => {
      const v = new THREE.Vector3(0, wy, 0).project(camera);
      return (-v.y * 0.5 + 0.5) * window.innerHeight;
    };

    const scaleForRectHeight = (pxHeight: number) => {
      const earthPxH = projectWorldY(-SPHERE_RADIUS * initialScale) - projectWorldY(SPHERE_RADIUS * initialScale);
      return initialScale * (pxHeight * 0.9) / earthPxH;
    };

    earthScroll.scale.setScalar(initialScale);

    const pointsMat = new THREE.ShaderMaterial({
      vertexShader:   VERT_PTS,
      fragmentShader: FRAG_PTS,
      uniforms: { uMask: { value: maskTex }, uScale: { value: initialScale } },
      transparent: true,
      depthWrite:  false,
    });

    const fallbackPts = new THREE.Points(new THREE.SphereGeometry(SPHERE_RADIUS, 64, 32), pointsMat);
    fallbackPts.renderOrder = 0;
    earthOrient.add(fallbackPts);

    new GLTFLoader().load(
      '/earth/scene.gltf',
      (gltf) => {
        let foundMesh: THREE.Mesh | null = null;
        gltf.scene.traverse((child) => { if ((child as THREE.Mesh).isMesh && !foundMesh) foundMesh = child as THREE.Mesh; });
        const mesh = foundMesh as THREE.Mesh | null;
        if (!mesh) return;

        gltf.scene.updateWorldMatrix(true, true);
        const geo = mesh.geometry.clone();
        geo.applyMatrix4(mesh.matrixWorld);
        geo.computeBoundingSphere();
        const { center, radius } = geo.boundingSphere!;
        geo.translate(-center.x, -center.y, -center.z);
        geo.scale(1 / radius, 1 / radius, 1 / radius);

        earthOrient.clear();

        const realPts = new THREE.Points(geo, pointsMat);
        realPts.renderOrder = 0;
        earthOrient.add(realPts);

        const diffuse = new THREE.TextureLoader().load('/earth/textures/Material.002_diffuse.jpeg');
        diffuse.colorSpace = THREE.SRGBColorSpace;
        diffuse.flipY = false;

        const meshMat = new THREE.MeshStandardMaterial({
          map:         diffuse,
          alphaMap:    maskTex,
          transparent: true,
          depthWrite:  false,
          depthTest:   false,
          side:        THREE.FrontSide,
          roughness:   0.9,
          metalness:   0.0,
        });
        earthMesh = new THREE.Mesh(geo, meshMat);
        earthMesh.renderOrder = 1;
        earthOrient.add(earthMesh);
      },
      undefined,
      (err) => console.warn('[EarthScrollStage] GLTF load failed — serve with next dev:', err)
    );

    // ── Measure earth target ("o" position) and title shrink targets ──
    // Pure — no GSAP side effects. Only called when the hero is in the viewport.
    function measureEarthTargets() {
      // ── Earth "o" target (title revealed — matches earthMove destination) ──
      gsap.set(titleWrap, { y: 0, opacity: 1 });
      const oRect = oTarget.getBoundingClientRect();
      const oCx   = oRect.left + oRect.width  / 2;
      const oCy   = oRect.top  + oRect.height / 2;

      const oWorld = new THREE.Vector3(
        (oCx / window.innerWidth)   * 2 - 1,
        -(oCy / window.innerHeight) * 2 + 1,
        0
      ).unproject(camera);
      oWorld.z = 0;

      const earthOScale = scaleForRectHeight(oRect.height);

      // ── Title shrink target ──────────────────────────────────
      const heroH1    = titleWrap.querySelector('h1') as HTMLElement | null;
      const anchorEl  = document.getElementById('article-title') as HTMLElement | null;

      let titleShrink = { scale: 0.47, dx: 0, dy: 0, earthFinalScale: earthOScale * 0.47 };

      if (heroH1) {
        const heroH1Rect = heroH1.getBoundingClientRect();

        const heroFs   = parseFloat(getComputedStyle(heroH1).fontSize);
        const anchorFs = anchorEl ? parseFloat(getComputedStyle(anchorEl).fontSize) : heroFs * 0.47;
        const scale    = anchorFs / heroFs;

        const targetLeft = anchorEl
          ? anchorEl.getBoundingClientRect().left
          : (() => {
              const rfs  = parseFloat(getComputedStyle(document.documentElement).fontSize);
              const vw   = window.innerWidth;
              const cMax  = 90 * rfs;
              const cLeft = Math.max(0, (vw - cMax) / 2);
              const pad   = vw >= 1024 ? 3 * rfs : vw >= 640 ? 2 * rfs : 1.5 * rfs;
              const toc   = vw >= 1060 ? 16 * rfs : 0;
              const gap   = vw >= 1060 ? 3.8 * rfs : 0;
              return cLeft + pad + toc + gap;
            })();

        const rfs       = parseFloat(getComputedStyle(document.documentElement).fontSize);
        const targetTop = (3.5 + 5.6) * rfs;

        const dx = targetLeft - heroH1Rect.left;
        const dy = targetTop  - heroH1Rect.top;

        titleShrink = { scale, dx, dy, earthFinalScale: earthOScale * scale };
      }

      // Measure where the O ends up after titleShrink by temporarily applying the transform
      gsap.set(titleWrap, { x: titleShrink.dx, y: titleShrink.dy, scale: titleShrink.scale, transformOrigin: 'left top' });
      const oFinalRect = oTarget.getBoundingClientRect();
      const oFinalCx   = oFinalRect.left + oFinalRect.width  / 2;
      const oFinalCy   = oFinalRect.top  + oFinalRect.height / 2;
      gsap.set(titleWrap, { x: 0, y: 60, scale: 1, clearProps: 'transformOrigin' });

      const oFinalWorld = new THREE.Vector3(
        (oFinalCx / window.innerWidth)  * 2 - 1,
        -(oFinalCy / window.innerHeight) * 2 + 1,
        0
      ).unproject(camera);
      oFinalWorld.z = 0;

      return { oWorld, earthOScale, titleShrink, oFinalWorld };
    }

    function killScrollStory() {
      scrollTriggers.forEach((st) => st.kill());
      scrollTriggers = [];
      if (scrollTimeline) {
        scrollTimeline.scrollTrigger?.kill();
        scrollTimeline.kill();
        scrollTimeline = null;
      }
    }

    // remeasure=true  → re-run DOM measurement (initial load, resize)
    // remeasure=false → reuse cached measurement (DialKit param changes mid-scroll)
    function buildScrollStory(remeasure = true) {
      killScrollStory();

      const p = earthParamsRef.current;

      // Always reset GSAP-driven state before rebuilding
      gsap.set(titleWrap,      { clearProps: 'all' });
      gsap.set(oTarget,        { visibility: 'hidden', clearProps: 'webkitTextStrokeColor,color,webkitTextStrokeWidth' });
      gsap.set(articleContent, { clearProps: 'opacity,visibility' });

      scrollPastHero = false;
      canvas.style.opacity = '1';
      if (titlePlacedInArticle) restoreTitleToHero();
      const articleTitle = document.getElementById('article-title') as HTMLElement | null;
      if (articleTitle) articleTitle.style.display = '';

      if (remeasure || !measuredTargets) {
        measuredTargets = measureEarthTargets();
      }
      const { titleShrink, oWorld } = measuredTargets;
      const [midPose, endPose] = STORY.earthTune;
      const inOPose = {
        x: oWorld.x + p.inOX,
        y: oWorld.y + p.inOY,
        scale: p.inOScale,
      };

      earthScroll.position.set(p.startX, p.startY, 0);
      earthScroll.scale.setScalar(initialScale * p.startScale);

      gsap.set(titleWrap,      { y: 60, opacity: 0 });
      gsap.set(scrollCue,      { opacity: 1 });
      gsap.set(articleContent, { opacity: 0, visibility: 'hidden' });
      articleContent.classList.remove('is-readable');

      scrollTriggers.push(
        gsap.to(scrollCue, {
          opacity: 0,
          scrollTrigger: {
            trigger: '#scroll-stage',
            start:   'top top',
            end:     '6% top',
            scrub:   true,
          },
        }).scrollTrigger!
      );

      scrollTimeline = gsap.timeline({
        scrollTrigger: {
          trigger:             '#scroll-stage',
          start:               'top top',
          end:                 STORY.scrollDistance,
          scrub:               STORY.scrub,
          pin:                 heroInner,
          anticipatePin:       1,
          invalidateOnRefresh: true,
          onLeave: () => {
            articleContent.classList.add('is-readable');
            setArticleHandoff(true);
          },
          onEnterBack: () => {
            setArticleHandoff(false);
            articleContent.classList.remove('is-readable');
          },
        },
      });

      scrollTimeline
        // ── Earth fly-in (GSAP — same scrub clock as everything else) ──
        .addLabel('earthMove', STORY.earthMove.at)
        .to(earthScroll.position, {
          x: inOPose.x, y: inOPose.y,
          duration: STORY.earthMove.duration, ease: STORY.earthMove.ease,
        }, 'earthMove')
        .to(earthScroll.scale, {
          x: initialScale * inOPose.scale,
          y: initialScale * inOPose.scale,
          z: initialScale * inOPose.scale,
          duration: STORY.earthMove.duration, ease: STORY.earthMove.ease,
        }, 'earthMove')

        // ── Earth settles to middle keyframe before title shrink ──
        .addLabel('earthMid', flyEnd)
        .to(earthScroll.position, {
          x: midPose.x, y: midPose.y,
          duration: midPose.at - flyEnd, ease: 'power2.inOut',
        }, 'earthMid')
        .to(earthScroll.scale, {
          x: initialScale * midPose.scale,
          y: initialScale * midPose.scale,
          z: initialScale * midPose.scale,
          duration: midPose.at - flyEnd, ease: 'power2.inOut',
        }, 'earthMid')

        // ── Title fades in from below ─────────────────────────
        .addLabel('titleReveal', STORY.titleReveal.at)
        .to(titleWrap, {
          y: 0, opacity: 1,
          duration: STORY.titleReveal.duration, ease: STORY.titleReveal.ease,
        }, 'titleReveal')
        .set(oTarget, { visibility: 'hidden' }, 'titleReveal')

        // ── Title + earth shrink together (shared label, duration, ease) ──
        .addLabel('titleShrink', STORY.titleShrink.at)
        .to(titleWrap, {
          x:               titleShrink.dx,
          y:               titleShrink.dy,
          scale:           titleShrink.scale,
          transformOrigin: 'left top',
          duration: STORY.titleShrink.duration, ease: STORY.titleShrink.ease,
        }, 'titleShrink')
        .to(earthScroll.position, {
          x: endPose.x, y: endPose.y,
          duration: STORY.titleShrink.duration, ease: STORY.titleShrink.ease,
        }, 'titleShrink')
        .to(earthScroll.scale, {
          x: initialScale * endPose.scale,
          y: initialScale * endPose.scale,
          z: initialScale * endPose.scale,
          duration: STORY.titleShrink.duration, ease: STORY.titleShrink.ease,
        }, 'titleShrink')

        // ── Article body fades in ─────────────────────────────
        .addLabel('articleIn', STORY.articleIn.at)
        .to(articleContent, {
          autoAlpha: 1,
          duration: STORY.articleIn.duration, ease: STORY.articleIn.ease,
        }, 'articleIn');
    }

    rebuildStoryRef.current = buildScrollStory;
    buildScrollStory();

    // ── Raycast, paint & drag ──────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse     = new THREE.Vector2();
    const drag      = { active: false, lastX: 0, lastY: 0, lastT: 0, pointerId: null as number | null, vx: 0, vy: 0 };
    const momentum  = { x: 0, y: 0 };
    let hoverUv: { u: number; v: number } | null = null;

    function pointerToNdc(e: PointerEvent) {
      mouse.set(
        (e.clientX / window.innerWidth)   * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      );
    }

    function raycastEarth() {
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(earthOrient.children, false);
      return hits.find((hit) => hit.uv) ?? null;
    }

    function setEarthCursor(state: 'grabbing' | 'grab' | null) {
      document.body.classList.toggle('is-dragging-earth', state === 'grabbing');
      document.body.classList.toggle('can-grab-earth',    state === 'grab');
    }

    function onPointerDown(e: PointerEvent) {
      if (e.button !== 0) return;
      pointerToNdc(e);
      if (!raycastEarth()) return;
      drag.active    = true;
      drag.lastX     = e.clientX;
      drag.lastY     = e.clientY;
      drag.lastT     = performance.now();
      drag.vx        = drag.vy = 0;
      drag.pointerId = e.pointerId;
      momentum.x     = momentum.y = 0;
      setEarthCursor('grabbing');
    }

    function onPointerMove(e: PointerEvent) {
      pointerToNdc(e);

      if (drag.active && e.pointerId === drag.pointerId) {
        const now = performance.now();
        const dt  = Math.max(now - drag.lastT, 1) / 1000;
        const dx  = e.clientX - drag.lastX;
        const dy  = e.clientY - drag.lastY;
        drag.lastX = e.clientX;
        drag.lastY = e.clientY;
        drag.lastT = now;
        const ry = dx * DRAG_SENS;
        const rx = dy * DRAG_SENS;
        earthDrag.rotation.y += ry;
        earthDrag.rotation.x += rx;
        drag.vy = drag.vy * 0.6 + (ry / dt) * 0.4;
        drag.vx = drag.vx * 0.6 + (rx / dt) * 0.4;
        return;
      }

      const hit = raycastEarth();
      hoverUv = hit?.uv ? { u: hit.uv.x, v: hit.uv.y } : null;
      if (!drag.active) setEarthCursor(hit ? 'grab' : null);
    }

    function endDrag(e: PointerEvent) {
      if (!drag.active || e.pointerId !== drag.pointerId) return;
      drag.active    = false;
      drag.pointerId = null;
      const clamp    = (v: number) => Math.max(-MAX_FLING, Math.min(MAX_FLING, v));
      momentum.y     = clamp(drag.vy);
      momentum.x     = clamp(drag.vx);
      setEarthCursor(null);
    }

    function onPointerLeave() {
      hoverUv = null;
      if (!drag.active) setEarthCursor(null);
    }

    window.addEventListener('pointerdown',   onPointerDown);
    window.addEventListener('pointermove',   onPointerMove);
    window.addEventListener('pointerup',     endDrag as EventListener);
    window.addEventListener('pointercancel', endDrag as EventListener);
    window.addEventListener('pointerleave',  onPointerLeave);

    function paint(u: number, v: number) {
      const x = u * MASK_SZ;
      const y = (1 - v) * MASK_SZ;
      const r = BRUSH_RADIUS;
      const stroke = (px: number, py: number) => {
        const g = maskCtx.createRadialGradient(px, py, 0, px, py, r);
        g.addColorStop(0,    'rgba(255,255,255,1)');
        g.addColorStop(0.65, 'rgba(255,255,255,1)');
        g.addColorStop(1,    'rgba(255,255,255,0)');
        maskCtx.globalCompositeOperation = 'source-over';
        maskCtx.fillStyle = g;
        maskCtx.fillRect(px - r, py - r, r * 2, r * 2);
      };
      stroke(x, y);
      if (u < 0.08) stroke(x + MASK_SZ, y);
      if (u > 0.92) stroke(x - MASK_SZ, y);
      maskTex.needsUpdate = true;
    }

    function decayMask(dt: number) {
      maskCtx.globalCompositeOperation = 'source-over';
      maskCtx.fillStyle = `rgba(0, 0, 0, ${MASK_DECAY * dt * 60})`;
      maskCtx.fillRect(0, 0, MASK_SZ, MASK_SZ);
      maskTex.needsUpdate = true;
    }

    // ── Render loop ────────────────────────────────────────────
    const clock = new THREE.Clock();
    let rafId: number;
    let rafAlive = true;

    (function loop() {
      if (!rafAlive) return;
      rafId = requestAnimationFrame(loop);
      const dt = clock.getDelta();

      if (!drag.active) {
        earthDrag.rotation.y += momentum.y * dt;
        earthDrag.rotation.x += momentum.x * dt;
        const decay = Math.pow(MOMENTUM_FRICTION, dt * 60);
        momentum.y *= decay;
        momentum.x *= decay;
        if (Math.abs(momentum.y) < 1e-4) momentum.y = 0;
        if (Math.abs(momentum.x) < 1e-4) momentum.x = 0;
        earthDrag.rotation.y += IDLE_SPIN * dt;
      }

      if (hoverUv && !drag.active) paint(hoverUv.u, hoverUv.v);
      decayMask(dt);

      const progress = (scrollTimeline as any)?.scrollTrigger?.progress ?? 0;

      // Update position readout every frame
      if (posReadoutRef.current) {
        const px = earthScroll.position.x;
        const py = earthScroll.position.y;
        const sc = earthScroll.scale.x / initialScale;
        posReadoutRef.current.textContent =
          `at ${progress.toFixed(2)}  ·  x ${px.toFixed(2)}  y ${py.toFixed(2)}  ·  scale ${sc.toFixed(2)}`;
      }

      pointsMat.uniforms.uScale.value = earthScroll.scale.x;
      renderer.render(scene, camera);
    })();

    // ── Resize ─────────────────────────────────────────────────
    let resizeTimer: ReturnType<typeof setTimeout>;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const aspect = window.innerWidth / window.innerHeight;
        (camera as THREE.OrthographicCamera).left  = -aspect * halfH;
        (camera as THREE.OrthographicCamera).right =  aspect * halfH;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        buildScrollStory(true); // remeasure — hero is back in viewport after resize
        ScrollTrigger.refresh();
      }, 150);
    }
    window.addEventListener('resize', onResize);

    teardown = () => {
      rafAlive = false;
      refreshScrollRef.current = null;
      rebuildStoryRef.current = null;
      cancelAnimationFrame(rafId);
      clearTimeout(resizeTimer);
      killScrollStory();
      window.removeEventListener('pointerdown',   onPointerDown);
      window.removeEventListener('pointermove',   onPointerMove);
      window.removeEventListener('pointerup',     endDrag as EventListener);
      window.removeEventListener('pointercancel', endDrag as EventListener);
      window.removeEventListener('pointerleave',  onPointerLeave);
      window.removeEventListener('resize',        onResize);
      renderer.dispose();
      document.body.classList.remove('is-dragging-earth', 'can-grab-earth');
    };
    })();

    return () => {
      alive = false;
      teardown?.();
    };
  }, []);

  return (
    <>
      <DialRoot position="bottom-right" />

      {nav && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50 }}>
          {nav}
        </div>
      )}

      {/* Position readout — dev tool */}
      <div style={{
        position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
        zIndex: 200, display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(0,0,0,0.72)', borderRadius: 8, padding: '5px 10px',
        backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.12)',
        fontFamily: 'monospace', fontSize: 11, color: '#fff', pointerEvents: 'auto',
        userSelect: 'none',
      }}>
        <span ref={posReadoutRef} />
        <button
          onClick={() => navigator.clipboard.writeText(posReadoutRef.current?.textContent ?? '')}
          style={{
            background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
            cursor: 'pointer', padding: '2px 8px', borderRadius: 4,
            fontSize: 11, fontFamily: 'monospace',
          }}
        >
          copy
        </button>
      </div>

      <canvas
        ref={canvasRef}
        style={{
          position:      'fixed',
          inset:         0,
          width:         '100%',
          height:        '100%',
          pointerEvents: 'none',
          zIndex:        1,
          touchAction:   'pan-y',
        }}
      />

      <section id="scroll-stage" style={{ position: 'relative', zIndex: 2 }}>
        {/* Hero — 100 vh, pinned during scroll story */}
        <div
          ref={heroInnerRef}
          id="hero-inner"
          style={{
            height:         '100vh',
            width:          '100%',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            pointerEvents:  'none',
            position:       'relative',
          }}
        >
          <div
            ref={titleWrapRef}
            id="title-wrap"
            style={{ textAlign: 'center', opacity: 0, willChange: 'transform, opacity' }}
          >
            <h1 className="earth-hero-title">
              W<span ref={oTargetRef} id="o-target">o</span>rld Model Deep-Dive
            </h1>
          </div>

          <div ref={scrollCueRef} id="scroll-cue">
            <span>Scroll</span>
            <div className="scroll-chevron" />
          </div>
        </div>

        {/* Article — fades in after scroll story, then scrolls normally */}
        <div
          ref={articleContentRef}
          id="article-content"
          style={{ position: 'relative', zIndex: 3 }}
        >
          {children}
        </div>
      </section>
    </>
  );
}
