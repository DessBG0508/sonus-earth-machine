"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { COLS, FSZ, GR, ROWS, clamp } from "@/lib/sonus/constants";
import { renderLoop } from "@/lib/sonus/loop";
import { sonusBus } from "@/lib/sonus/bus";
import { frameStore, genEarthTex, type DiscFrame } from "@/lib/sonus/textures";
import { loadUserFrame } from "@/lib/sonus/frame-loader";
import { useSonusStore } from "@/store/sonus-store";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { HudFrame } from "./HudFrame";
import { FrameWaveformStrip } from "./FrameWaveformStrip";

/* ------------------------------------------------------------------ */
/* shaders                                                             */
/* ------------------------------------------------------------------ */

const ATMO_VERT = /* glsl */ `
varying vec3 vN;
void main() {
  vN = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const ATMO_FRAG = /* glsl */ `
uniform vec3 uColor;
varying vec3 vN;
void main() {
  float f = pow(clamp(0.62 + dot(normalize(vN), vec3(0.0, 0.0, 1.0)), 0.0, 1.2), 5.0);
  gl_FragColor = vec4(uColor * f * 0.9, f * 0.9);
}
`;

const BAND_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vN;
void main() {
  vUv = uv;
  vN = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const BAND_FRAG = /* glsl */ `
uniform float uBandU;
uniform float uStrength;
varying vec2 vUv;
varying vec3 vN;
void main() {
  float d = vUv.x - uBandU;
  d = d - floor(d + 0.5);
  float coreK = (1.0 - smoothstep(0.0012, 0.0035, abs(d))) * 1.6;
  float compK = (1.0 - smoothstep(0.0008, 0.0025, abs(d + 0.0045))) * 0.9;
  float trailK = d < 0.0 ? exp(d * 40.0) * 0.42 : 0.0;
  float facing = smoothstep(-0.05, 0.28, normalize(vN).z);
  vec3 col = vec3(1.0, 0.176, 0.574) * (coreK + trailK) + vec3(0.133, 0.827, 0.933) * compK;
  float a = clamp((coreK + compK + trailK) * facing * uStrength, 0.0, 1.0);
  gl_FragColor = vec4(col * facing, a);
}
`;

const POINTS_VERT = /* glsl */ `
attribute float aBright;
uniform float uPixelRatio;
varying float vB;
varying float vF;
void main() {
  vB = aBright;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec3 n = normalize(normalMatrix * normalize(position));
  vF = smoothstep(-0.02, 0.32, n.z);
  gl_PointSize = (5.0 + aBright * 26.0) * uPixelRatio;
  gl_Position = projectionMatrix * mv;
}
`;

const POINTS_FRAG = /* glsl */ `
uniform float uStrength;
varying float vB;
varying float vF;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c);
  float glow = smoothstep(0.5, 0.05, r);
  float inten = pow(vB, 1.5) * vF * uStrength * glow;
  vec3 col = mix(vec3(1.0, 0.69, 0.13), vec3(1.0, 0.176, 0.574), clamp(vB * 1.4 - 0.2, 0.0, 1.0));
  gl_FragColor = vec4(col * inten * 1.7, inten);
}
`;

/* ------------------------------------------------------------------ */
/* column -> texture longitude (mirrors the v3 projection math)        */
/* ------------------------------------------------------------------ */

/**
 * Returns the equirect u (0..1) of the projected-sphere column being
 * sonified, or null when the column is over space (off-sphere) — exactly
 * the columns that stay silent in v3.
 */
function colToBandU(col: number): number | null {
  const x = ((col + 0.5) * FSZ) / COLS;
  const dx = (x - FSZ / 2 + 0.5) / GR;
  if (Math.abs(dx) >= 0.999) return null;
  const lon = Math.asin(clamp(dx, -0.999, 0.999));
  return (lon / Math.PI + 1) / 2;
}

function rowLatitude(r: number): number {
  const y = ((r + 0.5) * FSZ) / ROWS;
  const dy = (y - FSZ / 2 + 0.5) / GR;
  return Math.asin(clamp(-dy, -0.999, 0.999));
}

interface SceneApi {
  setDiscFrame: (frame: DiscFrame) => void;
}

const LAYER_OPACITY = { fires: 0.9, ndvi: 0.55, clouds: 0.6 } as const;

/**
 * The stage: a real 3D WebGL globe textured with the NASA imagery +
 * procedural v3 art, wrapped in a Fresnel atmosphere, orbital rings and a
 * starfield. A magenta shader band sweeps the exact texture longitude the
 * audio engine is sonifying, with 8 latitude highlight points pulsing with
 * the row brightness. Falls back to a 2D projection canvas if WebGL is
 * unavailable. Accepts drag & dropped NASA frames.
 */
export function GlobeStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<SceneApi | null>(null);
  const disc = useSonusStore((s) => s.disc);
  const discRef = useRef(disc);
  const reduced = useReducedMotion();
  const reducedRef = useRef(false);
  useEffect(() => {
    discRef.current = disc;
  }, [disc]);
  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);
  const [dragging, setDragging] = useState(false);
  const [flash, setFlash] = useState(false);
  const [webglFailed, setWebglFailed] = useState(false);
  const dragDepth = useRef(0);

  // build the three.js scene once
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      // WebGL unavailable — flip to the 2D fallback asynchronously
      const t = window.setTimeout(() => setWebglFailed(true), 0);
      return () => window.clearTimeout(t);
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 2, 0.1, 100);
    camera.position.set(0, 0.1, 3.55);
    camera.lookAt(0, 0, 0);

    const disposables: { dispose: () => void }[] = [];
    const track = <T extends { dispose: () => void }>(x: T): T => {
      disposables.push(x);
      return x;
    };

    // --- globe group (axial tilt + slow eastward spin) ---
    const tiltGroup = new THREE.Group();
    tiltGroup.rotation.z = 0.07;
    scene.add(tiltGroup);
    const spinGroup = new THREE.Group();
    spinGroup.rotation.y = -Math.PI / 2;
    tiltGroup.add(spinGroup);

    // --- planet sphere with the v3-style equirect texture ---
    const initialEq = genEarthTex(false, 5);
    const sphereTex = track(new THREE.CanvasTexture(initialEq));
    sphereTex.colorSpace = THREE.SRGBColorSpace;
    sphereTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const sphereMat = track(new THREE.MeshBasicMaterial({ map: sphereTex, toneMapped: false }));
    const sphereGeo = track(new THREE.SphereGeometry(1, 128, 64));
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    spinGroup.add(sphere);

    // --- fresnel atmosphere ---
    const atmoMat = track(
      new THREE.ShaderMaterial({
        vertexShader: ATMO_VERT,
        fragmentShader: ATMO_FRAG,
        uniforms: { uColor: { value: new THREE.Color("#22D3EE") } },
        side: THREE.BackSide,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    const atmoGeo = track(new THREE.SphereGeometry(1.14, 64, 48));
    const atmo = new THREE.Mesh(atmoGeo, atmoMat);
    atmo.renderOrder = 2;
    scene.add(atmo);

    // --- sweep band (shader sphere) ---
    const bandMat = track(
      new THREE.ShaderMaterial({
        vertexShader: BAND_VERT,
        fragmentShader: BAND_FRAG,
        uniforms: {
          uBandU: { value: 0.25 },
          uStrength: { value: 0.55 },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    const bandGeo = track(new THREE.SphereGeometry(1.006, 128, 64));
    const band = new THREE.Mesh(bandGeo, bandMat);
    band.renderOrder = 3;
    spinGroup.add(band);

    // --- 8 latitude highlight points on the scan meridian ---
    const ptPositions = new Float32Array(ROWS * 3);
    const ptBright = new Float32Array(ROWS);
    const ptGeo = track(new THREE.BufferGeometry());
    ptGeo.setAttribute("position", new THREE.BufferAttribute(ptPositions, 3));
    ptGeo.setAttribute("aBright", new THREE.BufferAttribute(ptBright, 1));
    const ptMat = track(
      new THREE.ShaderMaterial({
        vertexShader: POINTS_VERT,
        fragmentShader: POINTS_FRAG,
        uniforms: {
          uPixelRatio: { value: dpr },
          uStrength: { value: 0 },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    const points = new THREE.Points(ptGeo, ptMat);
    points.renderOrder = 4;
    spinGroup.add(points);

    const updatePointColumns = (col: number) => {
      const u = colToBandU(col);
      for (let r = 0; r < ROWS; r++) {
        const lat = rowLatitude(r);
        const i = r * 3;
        if (u === null) {
          ptPositions[i] = 0;
          ptPositions[i + 1] = Math.sin(lat) * 2.2; // parked off-globe
          ptPositions[i + 2] = 0;
        } else {
          const phi = 2 * Math.PI * u;
          const hor = Math.cos(lat) * 1.008;
          ptPositions[i] = -Math.cos(phi) * hor;
          ptPositions[i + 1] = Math.sin(lat) * 1.008;
          ptPositions[i + 2] = Math.sin(phi) * hor;
        }
        ptBright[r] = sonusBus.rows[r];
      }
      ptGeo.getAttribute("position").needsUpdate = true;
      ptGeo.getAttribute("aBright").needsUpdate = true;
    };
    updatePointColumns(sonusBus.col);

    // --- FIRES / NDVI / CLOUDS overlay shells ---
    const overlayCanvases: Record<"fires" | "ndvi" | "clouds", HTMLCanvasElement> = {
      fires: document.createElement("canvas"),
      ndvi: document.createElement("canvas"),
      clouds: document.createElement("canvas"),
    };
    const overlayMeshes = [] as { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; key: "fires" | "ndvi" | "clouds" }[];
    (["ndvi", "clouds", "fires"] as const).forEach((key, idx) => {
      const tex = track(new THREE.CanvasTexture(overlayCanvases[key]));
      tex.colorSpace = THREE.SRGBColorSpace;
      const mat = track(
        new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      const geo = track(new THREE.SphereGeometry(1.002 + idx * 0.001, 96, 48));
      const mesh = new THREE.Mesh(geo, mat);
      mesh.renderOrder = 1;
      spinGroup.add(mesh);
      overlayMeshes.push({ mesh, mat, key });
    });

    // --- orbital rings (cyan + orange, v3 reticle colors) ---
    const ringGeoA = track(new THREE.TorusGeometry(1.42, 0.0055, 8, 160));
    const ringMatA = track(
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    const ringA = new THREE.Mesh(ringGeoA, ringMatA);
    ringA.rotation.set(1.22, 0.15, 0.32);
    scene.add(ringA);

    const ringGeoB = track(new THREE.TorusGeometry(1.6, 0.0042, 8, 180));
    const ringMatB = track(
      new THREE.MeshBasicMaterial({ color: 0xff9a3c, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    const ringB = new THREE.Mesh(ringGeoB, ringMatB);
    ringB.rotation.set(1.5, -0.4, -0.5);
    scene.add(ringB);

    const makeDotRing = (radius: number, count: number, color: number, opacity: number) => {
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        positions[i * 3] = Math.cos(a) * radius;
        positions[i * 3 + 1] = Math.sin(a) * radius;
        positions[i * 3 + 2] = 0;
      }
      const geo = track(new THREE.BufferGeometry());
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const mat = track(
        new THREE.PointsMaterial({ color, size: 0.022, sizeAttenuation: true, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      const pts = new THREE.Points(geo, mat);
      scene.add(pts);
      return pts;
    };
    const dotsA = makeDotRing(1.74, 72, 0x22d3ee, 0.5);
    dotsA.rotation.set(1.35, 0.5, 0);
    const dotsB = makeDotRing(1.9, 48, 0xff2d92, 0.34);
    dotsB.rotation.set(1.1, -0.9, 0.4);

    // --- starfield ---
    const STAR_COUNT = 900;
    const starPos = new Float32Array(STAR_COUNT * 3);
    const starCol = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      const r = 9 + Math.random() * 18;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      starPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      starPos[i * 3 + 1] = r * Math.cos(ph);
      starPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      const t = Math.random();
      const c =
        t < 0.62
          ? [0.91, 0.96, 1.0]
          : t < 0.85
            ? [0.53, 0.83, 0.93]
            : [1.0, 0.78, 0.55];
      starCol[i * 3] = c[0];
      starCol[i * 3 + 1] = c[1];
      starCol[i * 3 + 2] = c[2];
    }
    const starGeo = track(new THREE.BufferGeometry());
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute("color", new THREE.BufferAttribute(starCol, 3));
    const starMat = track(
      new THREE.PointsMaterial({ size: 0.055, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false }),
    );
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // --- scene API (texture swaps from outside React) ---
    let flashPulse = 0;
    const api: SceneApi = {
      setDiscFrame: (frame) => {
        const newSphere = new THREE.CanvasTexture(frame.equirect);
        newSphere.colorSpace = THREE.SRGBColorSpace;
        newSphere.anisotropy = sphereTex.anisotropy;
        sphereMat.map?.dispose();
        sphereMat.map = newSphere;
        sphereMat.needsUpdate = true;
        track(newSphere);
        for (const { mat, key } of overlayMeshes) {
          const newTex = new THREE.CanvasTexture(frame.overlays[key]);
          newTex.colorSpace = THREE.SRGBColorSpace;
          mat.map?.dispose();
          mat.map = newTex;
          mat.needsUpdate = true;
          track(newTex);
        }
        flashPulse = 1;
        overlayCanvases.fires = frame.overlays.fires;
        overlayCanvases.ndvi = frame.overlays.ndvi;
        overlayCanvases.clouds = frame.overlays.clouds;
      },
    };
    apiRef.current = api;

    // --- resize ---
    const setSize = () => {
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    setSize();
    const ro = new ResizeObserver(setSize);
    ro.observe(container);

    // --- pointer parallax ---
    const parallax = { x: 0, y: 0, tx: 0, ty: 0 };
    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      parallax.tx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      parallax.ty = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    };
    container.addEventListener("pointermove", onPointerMove);

    // --- shared render loop ---
    let lastVersion = sonusBus.version;
    let bandStrength = 0.55;
    let pointsStrength = 0;
    const overlayOpacity = { fires: 0, ndvi: 0, clouds: 0 };

    const unsub = renderLoop.add((_now, dt) => {
      const RM = reducedRef.current;
      if (!RM) {
        spinGroup.rotation.y += 0.006 * dt;
        ringA.rotation.z += 0.12 * dt;
        ringB.rotation.z -= 0.08 * dt;
        dotsA.rotation.z += 0.05 * dt;
        dotsB.rotation.z -= 0.035 * dt;
        stars.rotation.y += 0.004 * dt;
        parallax.x += (parallax.tx * 0.16 - parallax.x) * Math.min(1, dt * 3);
        parallax.y += (parallax.ty * -0.1 - parallax.y) * Math.min(1, dt * 3);
        camera.position.x = parallax.x;
        camera.position.y = 0.1 + parallax.y;
        camera.lookAt(0, 0, 0);
      }

      const u = colToBandU(sonusBus.col);
      const target = u === null ? 0 : sonusBus.playing ? 1 : 0.55;
      bandStrength += (target - bandStrength) * Math.min(1, dt * 5);
      flashPulse = Math.max(0, flashPulse - dt * 1.8);
      if (u !== null) bandMat.uniforms.uBandU.value = u;
      bandMat.uniforms.uStrength.value = Math.min(1.4, bandStrength + flashPulse * 0.7);

      if (sonusBus.version !== lastVersion) {
        lastVersion = sonusBus.version;
        updatePointColumns(sonusBus.col);
      }
      pointsStrength += ((sonusBus.playing ? 1 : 0) - pointsStrength) * Math.min(1, dt * 6);
      ptMat.uniforms.uStrength.value = pointsStrength;

      for (const { mat, key } of overlayMeshes) {
        const targetO = sonusBus.layers[key] ? LAYER_OPACITY[key] : 0;
        overlayOpacity[key] += (targetO - overlayOpacity[key]) * Math.min(1, dt * 6);
        mat.opacity = overlayOpacity[key];
      }

      renderer.render(scene, camera);
    });

    return () => {
      unsub();
      ro.disconnect();
      container.removeEventListener("pointermove", onPointerMove);
      apiRef.current = null;
      for (const d of disposables) d.dispose();
      renderer.dispose();
    };
  }, []);

  // follow disc changes + frameStore rebuilds (textures swap, no re-render)
  useEffect(() => {
    const f = frameStore.get(disc);
    if (f) apiRef.current?.setDiscFrame(f);
  }, [disc]);

  useEffect(() => {
    return frameStore.subscribe(() => {
      const f = frameStore.get(discRef.current);
      if (f) apiRef.current?.setDiscFrame(f);
    });
  }, []);

  // 2D fallback renderer (WebGL unavailable)
  useEffect(() => {
    if (!webglFailed) return;
    const canvas = fallbackRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let W = 720;
    const H = 380;
    const fit = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      W = Math.max(1, Math.floor(parent.clientWidth));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas.parentElement as Element);
    const unsub = renderLoop.add(() => {
      const f = frameStore.get(discRef.current);
      ctx.clearRect(0, 0, W, H);
      if (f) ctx.drawImage(f.proj, (W - H) / 2, 0, H, H);
      const sx = ((sonusBus.col + 0.5) / COLS) * W;
      const grd = ctx.createLinearGradient(sx - 46, 0, sx, 0);
      grd.addColorStop(0, "rgba(255,45,146,0)");
      grd.addColorStop(1, "rgba(255,45,146,.16)");
      ctx.fillStyle = grd;
      ctx.fillRect(sx - 46, 0, 46, H - 52);
      ctx.save();
      ctx.shadowColor = "#FF2D92";
      ctx.shadowBlur = sonusBus.playing ? 16 : 6;
      ctx.strokeStyle = sonusBus.playing ? "#FF2D92" : "rgba(255,45,146,.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, H - 52);
      ctx.stroke();
      ctx.restore();
    });
    return () => {
      unsub();
      ro.disconnect();
    };
  }, [webglFailed]);

  // drag & drop -> sonify the dropped frame
  const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const ok = await loadUserFrame(file);
    if (ok) {
      setFlash(true);
      window.setTimeout(() => setFlash(false), 900);
    }
  };

  return (
    <div
      ref={containerRef}
      onDragEnter={(e) => {
        e.preventDefault();
        dragDepth.current += 1;
        setDragging(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => {
        dragDepth.current -= 1;
        if (dragDepth.current <= 0) setDragging(false);
      }}
      onDrop={onDrop}
      className="scanlines vignette relative h-[380px] w-full overflow-hidden rounded-[2px] border border-hud/30 bg-[#04060C] sm:h-[430px] lg:h-[462px]"
      style={{ boxShadow: "0 0 32px rgba(34,211,238,.10), inset 0 0 46px rgba(3,6,12,.7)" }}
      aria-label="Planet Earth 3D globe inside a JARVIS-style orbital HUD: concentric rings, atmosphere glow and telemetry. A magenta scan band sweeps across the sphere, converting its pixels to sound. Drop an equirectangular NASA frame here to project and sonify it."
      role="img"
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 block h-full w-full"
      />
      {webglFailed && (
        <canvas
          ref={fallbackRef}
          aria-hidden="true"
          className="absolute inset-0 block h-full w-full bg-[#04060C]"
        />
      )}

      {/* HUD telemetry */}
      <div className="pointer-events-none absolute left-3 top-3 z-10 select-none font-mono text-[9px] leading-[15px] text-mut/80">
        <div>SONIC MAPPER v4.0</div>
        <div>GLOBE WEBGL 3D · R 168PX</div>
        <div className="text-neon/80">REAL SVS + FIRMS/MODIS DATA</div>
        <div className="text-hud/70">96 COLS · 8 ROWS GRID</div>
      </div>
      <div className="pointer-events-none absolute right-3 top-3 z-10 select-none text-right font-mono text-[9px] leading-[15px]">
        <div className="text-neon/80">DATA LINK OK</div>
        <div className="text-hud/80">EQUIRECT → SPHERE</div>
        <div className="text-mut/80">LIVE PIXEL→SOUND</div>
      </div>

      <HudFrame />
      <FrameWaveformStrip />

      {dragging && (
        <div className="absolute inset-3 z-20 flex items-center justify-center rounded-[2px] border-2 border-dashed border-mag bg-[rgba(255,45,146,.08)]">
          <span className="font-mono text-xs tracking-[0.3em] text-mag" style={{ textShadow: "0 0 12px rgba(255,45,146,.6)" }}>
            DROP TO SONIFY
          </span>
        </div>
      )}
      {flash && (
        <div className="pointer-events-none absolute inset-0 z-20 animate-pulse rounded-[2px] border-2 border-neon shadow-[0_0_40px_rgba(57,255,136,.35)]" />
      )}
    </div>
  );
}
