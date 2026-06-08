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
const BRUSH_RADIUS = 26;
const MASK_DECAY = 0.014;
const READOUT_STORAGE_KEY = 'wmzt-earth-readout-v2';

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
export function EarthScrollStage({ children, nav, articlePreview }: { children: ReactNode; nav?: ReactNode; articlePreview?: ReactNode }) {
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

  // ── DialKit disabled (imports kept) ────────────────────────
  // const params = useDialKit('Animation', { … });

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
    earthDrag.rotation.x = THREE.MathUtils.degToRad(INITIAL_EARTH_TILT_DEG);
    earthDrag.add(earthOrient);
    earthScroll.add(earthDrag);
    scene.add(earthScroll);

    let earthMesh: THREE.Mesh | null = null;
    let scrollTimeline: gsap.core.Timeline | null = null;
    let scrollTriggers: ScrollTrigger[] = [];
    // Cached on initial build and resize — never re-measured mid-scroll
    let measuredTargets: { oWorld: THREE.Vector3; earthOScale: number; titleShrink: { scale: number; dx: number; dy: number; earthFinalScale: number }; oFinalWorld: THREE.Vector3; previewTop: number; previewLeft: number } | null = null;

    let scrollPastHero = false;
    let titlePlacedInArticle = false;

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

    const updateNavVisibility = () => {
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

    const ARTICLE_TITLE_CLASSES = [
      'font-display', 'font-semibold', 'leading-[1.05]', 'tracking-[-0.03em]', 'text-ink',
    ] as const;

    const restoreTitleToHero = () => {
      const articleTitle = document.getElementById('article-title') as HTMLElement | null;

      if (articleTitle) articleTitle.style.display = '';
      if (titleWrap.parentElement !== heroVisual) heroVisual.appendChild(titleWrap);

      titleH1.classList.add('earth-hero-title');
      titleH1.classList.remove(...ARTICLE_TITLE_CLASSES);
      titleH1.style.fontSize = '';

      // Restore clip container overflow so the rise animation works again
      const clipEl = document.getElementById('title-clip') as HTMLElement | null;
      if (clipEl) clipEl.style.overflow = 'hidden';

      gsap.set(titleH1, { y: '110%', clearProps: 'x,scale' });
      gsap.set(titleWrap, {
        y: 0, opacity: 1, textAlign: 'center',
        clearProps: 'x,scale,margin,padding,width,position,left,top,zIndex,transformOrigin',
      });
      gsap.set(oTarget, { visibility: 'hidden' });
      if (articlePreviewRef.current) gsap.set(articlePreviewRef.current, { autoAlpha: 0 });
      titlePlacedInArticle = false;
    };

    const setArticleHandoff = (active: boolean) => {
      scrollPastHero = active;
      canvas.style.opacity = active ? '0' : '1';
      // articleContent opacity is owned by the scrubbed timeline (fades in at ~p=0.76)

      const shell = getNavShell();
      if (shell && desktopMq.matches) {
        gsap.killTweensOf(shell);
        updateNavVisibility();
      }

      if (active && !titlePlacedInArticle) {
        const articleTitle = document.getElementById('article-title') as HTMLElement | null;
        const header = articleTitle?.closest('header');
        if (!header || !articleTitle) return;

        const anchorFs = parseFloat(getComputedStyle(articleTitle).fontSize);

        header.insertBefore(titleWrap, articleTitle);
        articleTitle.style.display = 'none';

        titleH1.classList.remove('earth-hero-title');
        titleH1.classList.add(...ARTICLE_TITLE_CLASSES);
        titleH1.style.fontSize = `${anchorFs}px`;

        // Release the clip so the article title renders without any overflow constraint
        const clipEl = document.getElementById('title-clip') as HTMLElement | null;
        if (clipEl) clipEl.style.overflow = 'visible';

        gsap.set(titleH1, { clearProps: 'transform' });
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
      // Temporarily reveal the h1 out of its clip so bounding rects are accurate
      gsap.set(titleH1, { y: 0 });
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
        const targetTop = anchorEl
          ? anchorEl.getBoundingClientRect().top - articleContent.getBoundingClientRect().top
          : 5.6 * rfs;

        const dx = targetLeft - heroH1Rect.left;
        const dy = targetTop  - heroH1Rect.top;

        titleShrink = { scale, dx, dy, earthFinalScale: earthOScale * scale };
      }

      // Measure where the O ends up after titleShrink by temporarily applying the transform
      gsap.set(titleWrap, { x: titleShrink.dx, y: titleShrink.dy, scale: titleShrink.scale, transformOrigin: 'left top' });
      const oFinalRect       = oTarget.getBoundingClientRect();
      const oFinalCx         = oFinalRect.left + oFinalRect.width  / 2;
      const oFinalCy         = oFinalRect.top  + oFinalRect.height / 2;
      // Measure the title's final bounding box to anchor the article preview below it
      const titleWrapFinalRect = titleWrap.getBoundingClientRect();
      const heroInnerRect      = heroInner.getBoundingClientRect();
      const previewTop  = titleWrapFinalRect.bottom - heroInnerRect.top;
      const previewLeft = titleWrapFinalRect.left   - heroInnerRect.left;
      gsap.set(titleH1, { y: '110%' });
      gsap.set(titleWrap, { x: 0, y: 0, scale: 1, clearProps: 'transformOrigin' });

      const oFinalWorld = new THREE.Vector3(
        (oFinalCx / window.innerWidth)  * 2 - 1,
        -(oFinalCy / window.innerHeight) * 2 + 1,
        0
      ).unproject(camera);
      oFinalWorld.z = 0;

      return { oWorld, earthOScale, titleShrink, oFinalWorld, previewTop, previewLeft };
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
      if (titlePlacedInArticle) restoreTitleToHero();
      const articleTitle = document.getElementById('article-title') as HTMLElement | null;
      if (articleTitle) articleTitle.style.display = '';

      if (remeasure || !measuredTargets) {
        measuredTargets = measureEarthTargets();
      }
      const { titleShrink, previewTop, previewLeft } = measuredTargets;

      earthScroll.position.set(0, 0, 0);
      earthScroll.scale.setScalar(initialScale);

      gsap.set(titleH1,        { y: '110%' });
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
            updateNavVisibility();
          },
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
          x:               titleShrink.dx + titleSpec.nudgeDx,
          y:               titleShrink.dy + titleSpec.nudgeDy,
          scale:           titleShrink.scale + titleSpec.nudgeScale,
          transformOrigin: 'left top',
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

      scrollTimeline.fromTo(articleContent,
        { autoAlpha: 0, y: -120 },
        { autoAlpha: 1, y: 0, duration: 0.24, ease: 'power2.out' },
        0.73
      );

      ScrollTrigger.refresh();
      cacheNavThresholdScrollY();
      updateNavVisibility();
    }

    rebuildStoryRef.current = buildScrollStory;
    buildScrollStory();
    requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      cacheNavThresholdScrollY();
      updateNavVisibility();
    });

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

    // ── Live earth positioning ─────────────────────────────────
    // Derives earth position and scale from oTarget's actual DOM position every
    // frame — robust to resize, font load, and scroll position at build time.
    function getOWorldProps() {
      const oRect    = oTarget.getBoundingClientRect();
      // Strip h1's current GSAP translateY so we get the "revealed" position
      const h1Matrix = new DOMMatrix(window.getComputedStyle(titleH1).transform);
      const h1Y      = h1Matrix.m42;
      // Subtract heroInner's viewport offset for scroll-invariance
      const heroTop  = heroInner.getBoundingClientRect().top;
      const aspect   = window.innerWidth / window.innerHeight;
      const oCx = oRect.left + oRect.width  / 2 - 1;   // nudge left
      const oCy = (oRect.top - heroTop) - h1Y + oRect.height / 2 + 8; // nudge down
      return {
        x:     ((oCx / window.innerWidth)  * 2 - 1) * halfH * aspect,
        y:     (-(oCy / window.innerHeight) * 2 + 1) * halfH,
        scale: scaleForRectHeight(oRect.height) * 0.62,
      };
    }

    function updateEarth(p: number) {
      const oProps = getOWorldProps();
      const ease = (t: number) => t < 0.5 ? 2*t*t : -2*(1-t)*(1-t)+1; // power2.inOut
      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
      const c    = (t: number) => Math.max(0, Math.min(1, t));

      if (p <= flyEnd) {
        // Phase 1: fly in from center to the "O"
        const t = ease(c(flyEnd > 0 ? p / flyEnd : 1));
        earthScroll.position.x = lerp(0, oProps.x, t);
        earthScroll.position.y = lerp(0, oProps.y, t);
        earthScroll.scale.setScalar(lerp(initialScale, oProps.scale, t));
      } else {
        // Phase 2: locked — earth tracks the "O" through all title animation
        // getBoundingClientRect already includes titleWrap's scale/translate,
        // so the earth automatically follows and shrinks with the title.
        earthScroll.position.x = oProps.x;
        earthScroll.position.y = oProps.y;
        earthScroll.scale.setScalar(oProps.scale);
      }
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

      const uv = hoverUv as { u: number; v: number } | null;
      if (uv && !drag.active) paint(uv.u, uv.v);
      decayMask(dt);

      const progress = (scrollTimeline as gsap.core.Animation | null)?.scrollTrigger?.progress ?? 0;

      updateEarth(progress);

      // Update position readout every frame
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
                  style={{ transform: 'translateY(110%)' }}
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
