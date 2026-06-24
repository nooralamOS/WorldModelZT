'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
// import { DialRoot, useDialKit } from 'dialkit';
import 'dialkit/styles.css';
import type * as THREE from 'three';


const STORY = {
  scrollDistance: '+=200%',
  scrub: true,
  earthMove: { at: 0, duration: 0.50, ease: 'power2.inOut' },
  // World-space keyframes for earth (scale = earthScroll.scale / initialScale)
  earthTune: [
    { at: 0.56, x: -2.97, y: -0.05, scale: 0.15 },
    { at: 0.89, x: -1.32, y:  1.18, scale: 0.07 },
  ],
};

// Default animation spec — DialKit sliders write into specRef at runtime
const DEFAULT_SPEC = {
  phases: {
    clipReveal:  { start: 0.24, end: 0.62 },
    titleShrink: { start: 0.56, end: 0.89 },
    bodyFade:    { start: 0.71, end: 0.89 },
    tocFade:     { start: 0.84, end: 1.00 },
  },
  title: { nudgeDx: 0, nudgeDy: 0, nudgeScale: 0 },
  body:  { gap: 12, nudgeDy: 0 },
};

const SPHERE_RADIUS = 1.0;
const MASK_SZ = 512;
const DRAG_SENS = 0.005;
const MOMENTUM_FRICTION = 0.95;
const MAX_FLING = 9.0;
const IDLE_SPIN = 0.08;
const INITIAL_EARTH_TILT_DEG = 12;
const MASK_CELL = 4;        // px per pixel-cell on the 512² mask → 128×128 grid
const BRUSH_MAX = 30;       // max reveal radius in mask px (at full speed)
const BRUSH_MIN_FRAC = 0.2; // radius floor as a fraction of BRUSH_MAX (first touch)
const MASK_NOISE = 7;       // ragged-edge jitter in mask px
const VEL_GAIN = 0.42;      // how fast the brush swells with speed
const VEL_REF = 1.5;        // contact-point speed (mask px/ms) that maxes the brush
const CELL_LIFE_MIN = 80;   // ms a revealed cell stays lit before fading
const CELL_LIFE_RAND = 340; // + up to this many ms (staggered dissolve)
const READOUT_STORAGE_KEY = 'wmzt-earth-readout-v2';
// Resting offset that tucks the title fully below the clip baseline before it's
// revealed. Must clear the font's line-box overflow (line-height: 0.95) or the
// glyph tops peek out. Used for the initial inline style AND every reset path.
const TITLE_HIDDEN_Y = '130%';

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
export function EarthScrollStage({ children, nav, articlePreview, view }: { children: ReactNode; nav?: ReactNode; articlePreview?: ReactNode; view?: string }) {
  const canvasRef         = useRef<HTMLCanvasElement>(null);
  const heroInnerRef      = useRef<HTMLDivElement>(null);
  const heroVisualRef     = useRef<HTMLDivElement>(null);
  const titleWrapRef      = useRef<HTMLDivElement>(null);
  const titleH1Ref        = useRef<HTMLHeadingElement>(null);
  const oTargetRef        = useRef<HTMLSpanElement>(null);
  const scrollCueRef      = useRef<HTMLDivElement>(null);
  const articleContentRef  = useRef<HTMLDivElement>(null);
  const articlePreviewRef  = useRef<HTMLDivElement>(null);
  const navShellRef        = useRef<HTMLDivElement>(null);
  const posReadoutRef     = useRef<HTMLSpanElement>(null);
  const [readoutOpen, setReadoutOpen] = useState(true);
  const [readoutMounted, setReadoutMounted] = useState(false);
  const setReadoutOpenPersist = useCallback((open: boolean) => {
    setReadoutOpen(open);
    try {
      localStorage.setItem(READOUT_STORAGE_KEY, open ? '1' : '0');
    } catch {
      /* private mode, etc. */
    }
  }, []);

  useEffect(() => {
    setReadoutMounted(true);
    try {
      if (localStorage.getItem(READOUT_STORAGE_KEY) === '0') {
        setReadoutOpen(false);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Animation spec — readable inside the Three.js effect closure via ref
  const specRef = useRef(DEFAULT_SPEC);
  const refreshScrollRef = useRef<(() => void) | null>(null);
  const rebuildStoryRef    = useRef<((remeasure?: boolean) => void) | null>(null);
  // Read/restore the scroll-story progress (0→1) so a view toggle can preserve
  // where you were instead of snapping back to the start of the earth animation.
  const getStoryProgressRef     = useRef<(() => number) | null>(null);
  const restoreStoryProgressRef = useRef<((p: number) => void) | null>(null);

  // ── DialKit disabled (imports kept) ────────────────────────
  // Earth-in-"O" fit was tuned live, then baked into the literals below in
  // getOWorldPropsFromDOM/Viewport: x offset -4px, y offset +4px, scale ×0.56.

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
      const heroVisual     = heroVisualRef.current!;
      const titleWrap      = titleWrapRef.current!;
      const titleH1        = titleH1Ref.current!;
      const oTarget        = oTargetRef.current!;
      const scrollCue      = scrollCueRef.current!;
      const articleContent = articleContentRef.current!;
      const tocSidebar     = document.getElementById('toc-sidebar') as HTMLElement | null;

    // ── Renderer (fullscreen — earth flies in from viewport center, fills the O slot) ──
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    const scene  = new THREE.Scene();
    const halfH  = Math.tan((45 / 2) * Math.PI / 180) * 5;
    const camera = new THREE.OrthographicCamera(
      -(window.innerWidth / window.innerHeight) * halfH,
       (window.innerWidth / window.innerHeight) * halfH,
      halfH, -halfH, 0.1, 100,
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
    maskTex.magFilter = THREE.NearestFilter;   // crisp pixel blocks — the "image-rendering: pixelated" of 3D
    maskTex.minFilter = THREE.NearestFilter;
    maskTex.generateMipmaps = false;

    // ── Pixel-grid etch-trail reveal state (Browserbase-style, in UV space) ──
    const MASK_GRID = MASK_SZ / MASK_CELL;     // 128 cells per axis
    const hashNoise = (x: number, y: number) => {
      const a = Math.sin(127.1 * x + 311.7 * y) * 43758.5453;
      return (a - Math.floor(a)) * 2 - 1;
    };
    const cells = Array.from({ length: MASK_GRID * MASK_GRID }, (_, i) => ({
      revealed: false,
      expiresAt: 0,
      noise: MASK_NOISE * hashNoise((i % MASK_GRID) * 0.5, Math.floor(i / MASK_GRID) * 0.5),
    }));
    const liveCells = new Set<number>();
    let maskDirty = false;
    let etchB = 0;                             // speed-driven brush intensity (BRUSH_MIN_FRAC → 1)
    let prevMx: number | null = null, prevMy = 0;

    const setMaskCell = (i: number, col: number, row: number, on: boolean) => {
      const cell = cells[i];
      if (cell.revealed === on) return;
      cell.revealed = on;
      maskCtx.fillStyle = on ? '#fff' : '#000';
      maskCtx.fillRect(col * MASK_CELL, row * MASK_CELL, MASK_CELL, MASK_CELL);
      maskDirty = true;
    };

    // earthScroll → position/scale  |  earthDrag → drag rotation  |  earthOrient → geometry holder
    const earthScroll  = new THREE.Group();
    const earthDrag    = new THREE.Group();
    const earthOrient  = new THREE.Group();
    earthDrag.rotation.x = THREE.MathUtils.degToRad(INITIAL_EARTH_TILT_DEG);
    earthDrag.add(earthOrient);
    earthScroll.add(earthDrag);
    scene.add(earthScroll);

    let earthMesh: THREE.Mesh | null = null;
    let scrollTimeline: gsap.core.Timeline | null = null;
    let scrollTriggers: ScrollTrigger[] = [];
    // Cached on initial build and resize — never re-measured mid-scroll
    let measuredTargets: { titleShrink: { dx: number; dy: number; heroFs: number; anchorFs: number }; previewTop: number; previewLeft: number } | null = null;

    let scrollPastHero = false;

    const getNavShell = () => navShellRef.current;
    const desktopMq = window.matchMedia('(min-width: 1060px)');
    const reducedMotionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const navSlideDuration = reducedMotionMq.matches ? 0.01 : 0.35;
    const NAV_THRESHOLD_PAD = 12;
    let navHidden = false;
    let navScrollListenerEnabled = false;
    let navThresholdScrollY = 0;

    const cacheNavThresholdScrollY = () => {
      const st = scrollTimeline?.scrollTrigger;
      const { tocFade } = specRef.current.phases;
      if (!st) return;
      navThresholdScrollY = st.start + (st.end - st.start) * tocFade.start;
    };

    const isPastNavThreshold = () => {
      const st = scrollTimeline?.scrollTrigger;
      const { tocFade } = specRef.current.phases;
      if (st?.isActive) {
        return st.progress >= tocFade.start;
      }
      const y = window.scrollY;
      if (navThresholdScrollY > 0) {
        if (navHidden) return y > navThresholdScrollY - NAV_THRESHOLD_PAD;
        return y >= navThresholdScrollY + NAV_THRESHOLD_PAD;
      }
      const intro = document.getElementById('intro');
      if (!intro) return scrollPastHero;
      const rfs = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const line = 6 * rfs;
      const top = intro.getBoundingClientRect().top;
      if (navHidden) return top < line + NAV_THRESHOLD_PAD;
      return top <= line - NAV_THRESHOLD_PAD;
    };

    const slideNavOut = () => {
      const shell = getNavShell();
      if (!shell || !desktopMq.matches || navHidden) return;
      navHidden = true;
      gsap.to(shell, {
        yPercent: -100,
        duration: navSlideDuration,
        ease: 'power2.in',
        overwrite: true,
      });
    };

    const slideNavIn = () => {
      const shell = getNavShell();
      if (!shell || !desktopMq.matches || !navHidden) return;
      navHidden = false;
      gsap.to(shell, {
        yPercent: 0,
        duration: navSlideDuration,
        ease: 'power2.out',
        overwrite: true,
      });
    };

    // The toggle replaced the section nav and is a persistent control —
    // never auto-hide it on scroll. (Machinery kept for potential reuse.)
    const NAV_AUTO_HIDE = false;
    const updateNavVisibility = () => {
      if (!NAV_AUTO_HIDE) return;
      if (!getNavShell() || !desktopMq.matches) return;
      if (isPastNavThreshold()) slideNavOut();
      else slideNavIn();
    };

    const onNavThresholdScroll = () => updateNavVisibility();

    const enableNavScrollListener = () => {
      if (navScrollListenerEnabled) return;
      navScrollListenerEnabled = true;
      window.addEventListener('scroll', onNavThresholdScroll, { passive: true });
    };

    const disableNavScrollListener = () => {
      if (!navScrollListenerEnabled) return;
      navScrollListenerEnabled = false;
      window.removeEventListener('scroll', onNavThresholdScroll);
      const shell = getNavShell();
      if (shell) gsap.killTweensOf(shell);
    };

    const onDesktopMqChange = () => {
      const shell = getNavShell();
      if (!shell) return;
      if (!desktopMq.matches) {
        disableNavScrollListener();
        navHidden = false;
        gsap.set(shell, { yPercent: 0 });
        return;
      }
      enableNavScrollListener();
      updateNavVisibility();
    };

    const onScrollTriggerRefresh = () => {
      cacheNavThresholdScrollY();
      updateNavVisibility();
    };

    desktopMq.addEventListener('change', onDesktopMqChange);
    if (desktopMq.matches) enableNavScrollListener();
    ScrollTrigger.addEventListener('refresh', onScrollTriggerRefresh);

    const restoreTitleToHero = () => {
      if (titleWrap.parentElement !== heroVisual) heroVisual.appendChild(titleWrap);

      const clipEl = document.getElementById('title-clip') as HTMLElement | null;
      if (clipEl) clipEl.style.overflow = 'hidden';

      gsap.set(titleH1, { y: TITLE_HIDDEN_Y, clearProps: 'x,scale,fontSize' });
      gsap.set(titleWrap, {
        y: 0, opacity: 1, textAlign: 'center',
        clearProps: 'x,scale,margin,padding,width,position,left,top,zIndex,transformOrigin,textAlign',
      });
      gsap.set(oTarget, { visibility: 'hidden' });
      if (articlePreviewRef.current) gsap.set(articlePreviewRef.current, { autoAlpha: 0 });
    };

    const initialScale = (halfH * 0.65) / SPHERE_RADIUS;
    const flyEnd = STORY.earthMove.at + STORY.earthMove.duration;
    const earthTrack = { x: 0, y: 0, scale: initialScale };

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
      // Temporarily reveal the h1 out of its clip so bounding rects are accurate
      gsap.set(titleH1, { y: 0 });
      gsap.set(titleWrap, { y: 0, opacity: 1 });
      // ── Title shrink target ──────────────────────────────────
      const heroH1    = titleWrap.querySelector('h1') as HTMLElement | null;
      const anchorEl  = document.getElementById('article-title') as HTMLElement | null;

      let titleShrink = { dx: 0, dy: 0, heroFs: 72, anchorFs: 34 };

      if (heroH1) {
        const heroH1Rect = heroH1.getBoundingClientRect();

        const heroFs   = parseFloat(getComputedStyle(heroH1).fontSize);
        const anchorFs = anchorEl ? parseFloat(getComputedStyle(anchorEl).fontSize) : heroFs * 0.47;

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
        const targetTop = anchorEl
          ? anchorEl.getBoundingClientRect().top - articleContent.getBoundingClientRect().top
          : 5.6 * rfs;

        gsap.set(titleH1, { y: 0, fontSize: `${anchorFs}px` });

        const shrunkRect = titleH1.getBoundingClientRect();
        const dx = targetLeft - shrunkRect.left;
        const dy = targetTop  - shrunkRect.top;

        gsap.set(titleH1, { clearProps: 'fontSize' });

        titleShrink = { dx, dy, heroFs, anchorFs };
      }

      // Measure where the O ends up after titleShrink by temporarily applying the transform
      gsap.set(titleH1, { y: 0, fontSize: `${titleShrink.anchorFs}px` });
      gsap.set(titleWrap, { x: titleShrink.dx, y: titleShrink.dy, clearProps: 'scale', transformOrigin: 'left top' });
      // Measure the title's final bounding box to anchor the article preview below it
      const titleWrapFinalRect = titleWrap.getBoundingClientRect();
      const heroInnerRect      = heroInner.getBoundingClientRect();
      const previewTop  = titleWrapFinalRect.bottom - heroInnerRect.top;
      const previewLeft = titleWrapFinalRect.left   - heroInnerRect.left;
      gsap.set(titleH1, { y: TITLE_HIDDEN_Y, clearProps: 'fontSize' });
      gsap.set(titleWrap, { x: 0, y: 0, clearProps: 'scale,transformOrigin' });

      return { titleShrink, previewTop, previewLeft };
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

      const { phases, title: titleSpec, body: bodySpec } = specRef.current;
      const articlePreviewEl = articlePreviewRef.current;
      const navEl = document.querySelector('nav[aria-label="Page sections"]') as HTMLElement | null;

      // Always reset GSAP-driven state before rebuilding
      gsap.set(titleWrap,      { clearProps: 'all' });
      gsap.set(oTarget,        { visibility: 'hidden', clearProps: 'webkitTextStrokeColor,color,webkitTextStrokeWidth' });
      gsap.set(articleContent, { clearProps: 'opacity,visibility,transform' });
      if (articlePreviewEl) gsap.set(articlePreviewEl, { clearProps: 'all' });
      gsap.set(document.body,  { backgroundColor: '#0127ff' });
      if (navEl) gsap.set(navEl, { backgroundColor: 'rgba(1,39,255,0.9)' });
      const shell = getNavShell();
      if (shell && desktopMq.matches) {
        gsap.set(shell, { yPercent: 0 });
        navHidden = false;
      }

      scrollPastHero = false;
      canvas.style.opacity = '1';
      restoreTitleToHero();

      if (remeasure || !measuredTargets) {
        measuredTargets = measureEarthTargets();
      }
      const { titleShrink, previewTop, previewLeft } = measuredTargets;
      const { dx, dy, heroFs, anchorFs } = titleShrink;

      earthScroll.position.set(0, 0, 0);
      earthScroll.scale.setScalar(initialScale);

      gsap.set(titleH1, { y: TITLE_HIDDEN_Y, clearProps: 'fontSize' });
      gsap.set(titleWrap,      { y: 0, opacity: 1 });
      gsap.set(scrollCue,      { opacity: 1 });
      gsap.set(articleContent, { opacity: 0, visibility: 'hidden' });
      if (tocSidebar) gsap.set(tocSidebar, { opacity: 0 });
      articleContent.classList.remove('is-readable');

      // Position the in-hero preview below the title's final landing spot
      if (articlePreviewEl) {
        gsap.set(articlePreviewEl, {
          position: 'absolute',
          top:      previewTop + bodySpec.gap,
          left:     previewLeft,
          right:    0,
          opacity:  0,
          visibility: 'hidden',
          y: 24,
        });
      }

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
          onUpdate: () => {
            renderEarth();
            updateNavVisibility();
          },
          onLeave: () => {
            scrollPastHero = true;
            articleContent.classList.add('is-readable');
            updateNavVisibility();
          },
          onEnterBack: () => {
            scrollPastHero = false;
            articleContent.classList.remove('is-readable');
            updateNavVisibility();
          },
        },
      });

      scrollTimeline
        // ── Title rises through clip baseline ─────────────────
        .addLabel('titleReveal', phases.clipReveal.start)
        .to(titleH1, {
          y: '0%',
          duration: phases.clipReveal.end - phases.clipReveal.start,
          ease: 'power2.out',
          force3D: false,
        }, 'titleReveal')
        .set(oTarget, { visibility: 'hidden' }, 'titleReveal')

        // ── Title shrinks to article header position ──────────
        .addLabel('titleShrink', phases.titleShrink.start)
        .to(titleWrap, {
          x:               dx + titleSpec.nudgeDx,
          y:               dy + titleSpec.nudgeDy,
          transformOrigin: 'left top',
          duration: phases.titleShrink.end - phases.titleShrink.start,
          ease: 'power2.inOut',
          force3D: false,
        }, 'titleShrink')
        .to(titleH1, {
          fontSize: `${anchorFs}px`,
          duration: phases.titleShrink.end - phases.titleShrink.start,
          ease: 'power2.inOut',
          force3D: false,
        }, 'titleShrink')

        // ── Article content + sidebar fade in ─────────────────
        .addLabel('articleIn', phases.bodyFade.start)
        .addLabel('tocIn', phases.tocFade.start);

      scrollTimeline.to(document.body, {
        backgroundColor: '#00158c',
        duration: phases.bodyFade.end - phases.bodyFade.start,
        ease: 'power1.inOut',
      }, 'articleIn');

      if (navEl) {
        scrollTimeline.to(navEl, {
          backgroundColor: 'rgba(0,21,140,0.9)',
          duration: phases.bodyFade.end - phases.bodyFade.start,
          ease: 'power1.inOut',
        }, 'articleIn');
      }

      if (articlePreviewEl) {
        // Quick fade-in, then fade out as real article takes over at 0.76
        scrollTimeline.to(articlePreviewEl, {
          autoAlpha: 1,
          y: bodySpec.nudgeDy,
          duration: 0.05,
          ease: 'power2.out',
        }, 'articleIn');
        scrollTimeline.to(articlePreviewEl, {
          autoAlpha: 0,
          duration: 0.13,
          ease: 'power2.in',
        }, 0.76);
      }

      if (tocSidebar) {
        scrollTimeline.to(tocSidebar, {
          opacity: 1,
          duration: phases.tocFade.end - phases.tocFade.start,
          ease: 'power2.out',
        }, 'tocIn');
      }

      // TLDR cards sit in a fixed spot and simply fade in. Rather than scrub the
      // reveal with scroll (which makes them appear to "come up"), play a real,
      // time-based opacity fade once the title has landed (timeline ≈ 0.73), so
      // they fade in place. The full article keeps its scrubbed slide-down reveal.
      const isTldr = !document.getElementById('toc-sidebar');
      if (isTldr) {
        const cardFade = gsap.fromTo(articleContent,
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.6, ease: 'power2.out', paused: true },
        );
        // STORY.scrollDistance ('+=200%') → pin spans this many viewport heights.
        const storyVH = parseFloat(STORY.scrollDistance.replace(/[^\d.]/g, '')) / 100;
        scrollTriggers.push(
          ScrollTrigger.create({
            trigger: '#scroll-stage',
            start: () => `top top-=${0.73 * storyVH * window.innerHeight}`,
            onEnter: () => cardFade.play(),
            onLeaveBack: () => cardFade.pause(0),
          }),
        );
      } else {
        scrollTimeline.fromTo(articleContent,
          { autoAlpha: 0, y: -120 },
          { autoAlpha: 1, y: 0, duration: 0.24, ease: 'power2.out' },
          0.73,
        );
      }

      // Fly-in only on the timeline (0→flyEnd). After that, live DOM lock tracks the O glyph.
      const sampleEarthAtProgress = (p: number) => {
        const saved = scrollTimeline!.progress();
        scrollTimeline!.progress(p);
        const props = getOWorldPropsFromDOM();
        scrollTimeline!.progress(saved);
        return props;
      };

      const atFlyEnd = sampleEarthAtProgress(flyEnd);

      Object.assign(earthTrack, { x: 0, y: 0, scale: initialScale });

      scrollTimeline
        .set(earthTrack, { x: 0, y: 0, scale: initialScale }, 0)
        .to(earthTrack, {
          x: atFlyEnd.x,
          y: atFlyEnd.y,
          scale: atFlyEnd.scale,
          duration: STORY.earthMove.duration,
          ease: STORY.earthMove.ease,
        }, STORY.earthMove.at);

      ScrollTrigger.refresh();
      cacheNavThresholdScrollY();
      updateNavVisibility();
    }

    rebuildStoryRef.current = buildScrollStory;

    getStoryProgressRef.current = () =>
      scrollTimeline?.scrollTrigger?.progress ?? (scrollPastHero ? 1 : 0);

    // Scroll to the position matching a 0→1 timeline progress, then sync
    // ScrollTrigger so the earth/title/content land in their final state.
    restoreStoryProgressRef.current = (p: number) => {
      const st = scrollTimeline?.scrollTrigger;
      if (!st) return;
      const clamped = Math.min(Math.max(p, 0), 1);
      window.scrollTo({ top: st.start + (st.end - st.start) * clamped });
      ScrollTrigger.update();
    };

    // ── Raycast, paint & drag ──────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse     = new THREE.Vector2();
    const drag      = { active: false, lastX: 0, lastY: 0, lastT: 0, pointerId: null as number | null, vx: 0, vy: 0 };
    const momentum  = { x: 0, y: 0 };
    let hoverUv: { u: number; v: number } | null = null;

    function pointerToNdc(e: PointerEvent) {
      mouse.set(
        (e.clientX / window.innerWidth)   * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1,
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

    // Reveal one circular dab of pixel-cells centred at mask px (mx, my).
    // Columns wrap around the longitude seam; rows (latitude) are clamped.
    function etchStamp(mx: number, my: number, radius: number, now: number) {
      const r2 = radius + MASK_NOISE;
      const c0 = Math.floor((mx - r2) / MASK_CELL), c1 = Math.ceil((mx + r2) / MASK_CELL);
      const r0 = Math.max(0, Math.floor((my - r2) / MASK_CELL));
      const r1 = Math.min(MASK_GRID - 1, Math.ceil((my + r2) / MASK_CELL));
      for (let ry = r0; ry <= r1; ry++) {
        for (let cx = c0; cx <= c1; cx++) {
          const wcx = ((cx % MASK_GRID) + MASK_GRID) % MASK_GRID;
          const i = ry * MASK_GRID + wcx;
          const cell = cells[i];
          const rad = radius + cell.noise;
          if (rad <= 0) continue;
          const dx = cx * MASK_CELL + MASK_CELL / 2 - mx;
          const dy = ry * MASK_CELL + MASK_CELL / 2 - my;
          if (dx * dx + dy * dy < rad * rad) {
            setMaskCell(i, wcx, ry, true);
            cell.expiresAt = now + CELL_LIFE_MIN + CELL_LIFE_RAND * Math.random();
            liveCells.add(i);
          }
        }
      }
    }

    // Stamp dabs along prev → (mx, my) so a fast-moving contact point stays continuous.
    function etchLine(mx: number, my: number, radius: number, now: number) {
      const seamJump = prevMx === null ||
        Math.abs(mx - prevMx) > MASK_SZ * 0.5 || Math.abs(my - prevMy) > MASK_SZ * 0.5;
      if (seamJump) {
        etchStamp(mx, my, radius, now);
      } else {
        const dist = Math.hypot(mx - prevMx!, my - prevMy);
        const step = Math.max(MASK_CELL, radius * 0.5);   // < radius ⇒ dabs overlap
        const steps = Math.min(256, Math.ceil(dist / step));
        for (let s = 1; s <= steps; s++) {
          const t = s / steps;
          etchStamp(prevMx! + (mx - prevMx!) * t, prevMy + (my - prevMy) * t, radius, now);
        }
      }
      prevMx = mx; prevMy = my;
    }

    // Reveal at hover UV; radius is small on first touch and blooms with contact-point speed.
    function paint(u: number, v: number, now: number, dt: number) {
      const mx = u * MASK_SZ, my = (1 - v) * MASK_SZ;
      let speed = 0; // mask px per ms
      if (prevMx !== null && dt > 0 &&
          Math.abs(mx - prevMx) < MASK_SZ * 0.5 && Math.abs(my - prevMy) < MASK_SZ * 0.5) {
        speed = Math.hypot(mx - prevMx, my - prevMy) / (dt * 1000);
      }
      etchB = Math.max(BRUSH_MIN_FRAC, etchB * Math.pow(0.9, dt * 60)); // decay toward floor
      etchB = Math.min(1, etchB + VEL_GAIN * Math.min(1, speed / VEL_REF)); // swell with speed
      etchLine(mx, my, BRUSH_MAX * etchB, now);
    }

    // Clear cells whose lifetime elapsed → the dissolving pixel trail.
    function decayMask(now: number) {
      for (const i of liveCells) {
        if (cells[i].expiresAt <= now) {
          setMaskCell(i, i % MASK_GRID, Math.floor(i / MASK_GRID), false);
          liveCells.delete(i);
        }
      }
    }

    // Hero-pinned coords — used only when sampling timeline keyframes at build time.
    function getOWorldPropsFromDOM() {
      const oRect   = oTarget.getBoundingClientRect();
      const h1Y     = new DOMMatrix(window.getComputedStyle(titleH1).transform).m42;
      const heroTop = heroInner.getBoundingClientRect().top;
      const aspect  = window.innerWidth / window.innerHeight;
      const oCx     = oRect.left + oRect.width / 2 - 4;
      const oCy     = (oRect.top - heroTop) - h1Y + oRect.height / 2 + 4;

      return {
        x:     ((oCx / window.innerWidth)  * 2 - 1) * halfH * aspect,
        y:     (-(oCy / window.innerHeight) * 2 + 1) * halfH,
        scale: scaleForRectHeight(oRect.height) * 0.56,
      };
    }

    // Viewport coords — after the story ends and the hero unpins.
    function getOWorldPropsViewport() {
      const oRect  = oTarget.getBoundingClientRect();
      const aspect = window.innerWidth / window.innerHeight;
      const oCx    = oRect.left + oRect.width / 2 - 4;
      const oCy    = oRect.top + oRect.height / 2 + 4;

      return {
        x:     ((oCx / window.innerWidth)  * 2 - 1) * halfH * aspect,
        y:     (-(oCy / window.innerHeight) * 2 + 1) * halfH,
        scale: scaleForRectHeight(oRect.height) * 0.56,
      };
    }

    function applyEarthPosition() {
      const st = scrollTimeline?.scrollTrigger;
      const progress = st?.progress ?? (scrollPastHero ? 1 : 0);

      let props: { x: number; y: number; scale: number };
      if (scrollPastHero && st && !st.isActive) {
        props = getOWorldPropsViewport();
      } else if (progress > flyEnd) {
        props = getOWorldPropsFromDOM();
      } else {
        props = earthTrack;
      }

      earthScroll.position.x = props.x;
      earthScroll.position.y = props.y;
      earthScroll.scale.setScalar(props.scale);
    }

    const renderEarth = () => {
      applyEarthPosition();
      pointsMat.uniforms.uScale.value = earthScroll.scale.x;
      renderer.render(scene, camera);
    };

    // ── Render loop (GSAP ticker — same frame as ScrollTrigger scrub) ──
    const clock = new THREE.Clock();

    const renderFrame = () => {
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

      const nowMs = performance.now();
      const uv = hoverUv as { u: number; v: number } | null;
      if (uv && !drag.active) {
        paint(uv.u, uv.v, nowMs, dt);
      } else {
        prevMx = null; // break the trail when not hovering / while dragging
      }
      decayMask(nowMs);
      if (maskDirty) { maskTex.needsUpdate = true; maskDirty = false; }

      applyEarthPosition();

      const progress = (scrollTimeline as gsap.core.Animation | null)?.scrollTrigger?.progress
        ?? (scrollPastHero ? 1 : 0);

      if (posReadoutRef.current) {
        const px = earthScroll.position.x;
        const py = earthScroll.position.y;
        const sc = earthScroll.scale.x / initialScale;
        const tiltX = THREE.MathUtils.radToDeg(earthDrag.rotation.x);
        const tiltY = THREE.MathUtils.radToDeg(earthDrag.rotation.y);
        posReadoutRef.current.textContent =
          `at ${progress.toFixed(2)}  ·  x ${px.toFixed(2)}  y ${py.toFixed(2)}  ·  scale ${sc.toFixed(2)}  ·  tilt ${tiltX.toFixed(1)}° ${tiltY.toFixed(1)}°`;
      }

      pointsMat.uniforms.uScale.value = earthScroll.scale.x;
      renderer.render(scene, camera);
    };

    gsap.ticker.add(renderFrame);

    buildScrollStory();
    requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      cacheNavThresholdScrollY();
      updateNavVisibility();
    });

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
      }, 150);
    }
    window.addEventListener('resize', onResize);

    teardown = () => {
      refreshScrollRef.current = null;
      rebuildStoryRef.current = null;
      gsap.ticker.remove(renderFrame);
      clearTimeout(resizeTimer);
      killScrollStory();
      window.removeEventListener('pointerdown',   onPointerDown);
      window.removeEventListener('pointermove',   onPointerMove);
      window.removeEventListener('pointerup',     endDrag as EventListener);
      window.removeEventListener('pointercancel', endDrag as EventListener);
      window.removeEventListener('pointerleave',  onPointerLeave);
      window.removeEventListener('resize',        onResize);
      disableNavScrollListener();
      ScrollTrigger.removeEventListener('refresh', onScrollTriggerRefresh);
      desktopMq.removeEventListener('change', onDesktopMqChange);
      renderer.dispose();
      document.body.classList.remove('is-dragging-earth', 'can-grab-earth');
    };
    })();

    return () => {
      alive = false;
      teardown?.();
    };
  }, []);

  // View toggle (TLDR ⇄ Full Article) swaps the children inside #article-content.
  // After the new content commits, reset to the top and rebuild the scroll story
  // so the title re-measures its shrink target against the new layout.
  const viewMountedRef = useRef(false);
  useEffect(() => {
    if (!viewMountedRef.current) {
      viewMountedRef.current = true;
      return;
    }
    // Where were you in the earth animation before the swap? If you'd already
    // scrolled past it (progress ≈ 1), restore that completed state after the
    // rebuild instead of snapping back to the start of the animation.
    const prevProgress = getStoryProgressRef.current?.() ?? 0;
    // Measurement requires the hero in the viewport, so rebuild from the top…
    window.scrollTo({ top: 0 });
    const id = requestAnimationFrame(() => {
      rebuildStoryRef.current?.(true);
      refreshScrollRef.current?.();
      // …then jump to the matching progress on the freshly measured layout.
      if (prevProgress > 0) restoreStoryProgressRef.current?.(prevProgress);
    });
    return () => cancelAnimationFrame(id);
  }, [view]);

  return (
    <>
      {nav && (
        <div
          ref={navShellRef}
          className="site-nav-shell"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50 }}
        >
          {nav}
        </div>
      )}

      {readoutMounted && createPortal(
        readoutOpen ? (
          <div
            id="earth-readout"
            style={{
              position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
              zIndex: 99999, display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(0,0,0,0.85)', borderRadius: 8, padding: '5px 10px',
              backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.2)',
              fontFamily: 'monospace', fontSize: 11, color: '#fff', pointerEvents: 'auto',
              userSelect: 'none', minWidth: 120,
            }}
          >
            <span ref={posReadoutRef}>…</span>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(posReadoutRef.current?.textContent ?? '')}
              style={{
                background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
                cursor: 'pointer', padding: '2px 8px', borderRadius: 4,
                fontSize: 11, fontFamily: 'monospace',
              }}
            >
              copy
            </button>
            <button
              type="button"
              aria-label="Hide earth readout"
              title="Hide readout"
              onClick={() => setReadoutOpenPersist(false)}
              style={{
                background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.55)',
                cursor: 'pointer', padding: '0 4px', lineHeight: 1, fontSize: 16,
              }}
            >
              ×
            </button>
          </div>
        ) : (
          <button
            type="button"
            id="earth-readout-toggle"
            aria-label="Show earth readout"
            title="Earth readout"
            onClick={() => setReadoutOpenPersist(true)}
            style={{
              position: 'fixed', bottom: 20, right: 20, zIndex: 99999,
              width: 36, height: 36, borderRadius: '50%',
              background: '#000', color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: '0 4px 14px rgba(0,0,0,0.45)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'monospace', fontSize: 13, fontWeight: 600, letterSpacing: '-0.04em',
              pointerEvents: 'auto', userSelect: 'none',
            }}
          >
            E
          </button>
        ),
        document.body,
      )}

      <canvas
        ref={canvasRef}
        style={{
          position:      'fixed',
          inset:         0,
          width:         '100%',
          height:        '100%',
          pointerEvents: 'none',
          zIndex:        2,
          touchAction:   'pan-y',
        }}
      />

      <section id="scroll-stage" style={{ position: 'relative' }}>
        {/* Hero — pinned during scroll story. height:0 so the GSAP spacer alone
            offsets articleContent; at p=1.0 the article arrives at viewport top
            with no jump. heroVisual fills the viewport visually via absolute. */}
        <div
          ref={heroInnerRef}
          id="hero-inner"
          style={{
            height:   0,
            width:    '100%',
            overflow: 'visible',
            position: 'relative',
          }}
        >
          <div
            ref={heroVisualRef}
            id="hero-visual"
            style={{
              position:       'absolute',
              top:            0,
              left:           0,
              right:          0,
              height:         '100vh',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              pointerEvents:  'none',
              zIndex:         1,
            }}
          >
            <div
              ref={titleWrapRef}
              id="title-wrap"
              style={{ textAlign: 'center' }}
            >
              {/* overflow:hidden creates the invisible baseline — h1 rises up through it */}
              <div id="title-clip" style={{ overflow: 'hidden', padding: '0.02em 0 0.9em' }}>
                <h1
                  ref={titleH1Ref}
                  className="earth-hero-title"
                  style={{ transform: `translateY(${TITLE_HIDDEN_Y})` }}
                >
                  W<span ref={oTargetRef} id="o-target">o</span>rld Model Deep-Dive
                </h1>
              </div>
            </div>

            <div ref={scrollCueRef} id="scroll-cue">
              <span>Scroll</span>
              <div className="scroll-chevron" />
            </div>

            {articlePreview && (
              <div
                ref={articlePreviewRef}
                id="article-preview"
                style={{
                  position:      'absolute',
                  top:           0,
                  left:          0,
                  right:         0,
                  opacity:       0,
                  visibility:    'hidden',
                  pointerEvents: 'none',
                }}
              >
                {articlePreview}
              </div>
            )}
          </div>
        </div>

        {/* Article — hidden until GSAP initialises (prevents flash while spacer is absent) */}
        <div
          ref={articleContentRef}
          id="article-content"
          style={{ position: 'relative', zIndex: 3, visibility: 'hidden', opacity: 0}}
        >
          {children}
        </div>
      </section>
    </>
  );
}
