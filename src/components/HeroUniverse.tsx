"use client";

import Image from 'next/image';
import Link from 'next/link';
import { Pause, Play } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { createHeroDragRotation, resetHeroDragRotation, setHeroDragRotation, stepHeroDragReturn } from '../lib/heroDrag';
import styles from './HeroUniverse.module.css';

interface OrbitApp {
  name: string;
  imageSrc?: string;
  detailHref?: string;
}

const PHASES = [2.35, .78, -.78, -2.35];
const PERIOD = 48;

export function HeroUniverse({ apps }: { apps: OrbitApp[] }) {
  const host = useRef<HTMLDivElement>(null);
  const canvasHost = useRef<HTMLDivElement>(null);
  const dragControl = useRef<HTMLButtonElement>(null);
  const dragDescriptionId = useId();
  const satellites = useRef<(HTMLDivElement | null)[]>([]);
  const paused = useRef(false);
  const interacting = useRef(false);
  const focused = useRef(false);
  const invalidate = useRef(() => {});
  const [isPaused, setIsPaused] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const element = host.current;
    const mount = canvasHost.current;
    const control = dragControl.current;
    if (!element || !mount || !control) return;
    const controller = new AbortController();
    let disposed = false;
    let cleanup = () => {};

    async function setup() {
      const [THREE, { GLTFLoader }, { RoomEnvironment }] = await Promise.all([
        import('three'),
        import('three/addons/loaders/GLTFLoader.js'),
        import('three/addons/environments/RoomEnvironment.js'),
      ]);
      if (disposed) return;
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.25;
      mount!.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, .1, 40);
      camera.position.z = 12.5;
      const studio = new RoomEnvironment();
      const pmrem = new THREE.PMREMGenerator(renderer);
      const environment = pmrem.fromScene(studio, .04);
      scene.environment = environment.texture;
      studio.dispose();
      pmrem.dispose();
      const key = new THREE.DirectionalLight(0xfff7ee, 3.2);
      key.position.set(-3, 5, 6);
      const fill = new THREE.DirectionalLight(0xd9e6ff, 1.8);
      fill.position.set(4, 0, 3);
      scene.add(key, fill, new THREE.HemisphereLight(0xf0f5ff, 0x677182, 1.8));

      const orbitTilt = new THREE.Euler(.76, 0, -.24);
      const orbitPoint = (angle: number, radius = 2.88) => new THREE.Vector3(
        Math.cos(angle) * radius, Math.sin(angle) * radius, 0,
      ).applyEuler(orbitTilt);
      const orbitMaterial = new THREE.LineBasicMaterial({ color: 0x8b98ad, transparent: true, opacity: .24 });
      for (const radius of [2.88, 2.54]) {
        const points = Array.from({ length: 160 }, (_, i) => orbitPoint(i / 160 * Math.PI * 2, radius));
        scene.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), orbitMaterial));
      }

      const model = new THREE.Group();
      scene.add(model);
      let width = 1, height = 1, frame = 0, previousTime = 0, elapsed = 0;
      let visible = false, contextLost = false;
      const motion = matchMedia('(prefers-reduced-motion: reduce)');
      const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
      const draggable = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 761px) and (prefers-reduced-motion: no-preference)');
      const drag = createHeroDragRotation();
      let gesture: { id: number; x: number; y: number; pitch: number; yaw: number; width: number } | null = null;
      const target = { x: 0, y: 0 };
      const current = { x: 0, y: 0 };
      const requestDraw = () => {
        if (!disposed && visible && !document.hidden && !contextLost && !frame) frame = requestAnimationFrame(draw);
      };
      function draw(now: number) {
        frame = 0;
        const dt = previousTime ? Math.min((now - previousTime) / 1000, .05) : 0;
        previousTime = now;
        const moving = !motion.matches && !paused.current && !interacting.current && !focused.current && !drag.active;
        if (moving) elapsed += dt;
        const ease = motion.matches ? 1 : 1 - Math.exp(-Math.max(dt, .016) * 8);
        current.x += ((motion.matches ? 0 : target.x) - current.x) * ease;
        current.y += ((motion.matches ? 0 : target.y) - current.y) * ease;
        const returning = stepHeroDragReturn(drag, dt);
        model.rotation.set(.17 + current.y * .12 + drag.pitch, -.22 + current.x * .18 + drag.yaw, -.18 + (motion.matches ? 0 : Math.sin(elapsed * .24) * .035));
        satellites.current.forEach((satellite, index) => {
          if (!satellite) return;
          const position = orbitPoint(PHASES[index] + elapsed / PERIOD * Math.PI * 2);
          const scale = 1 + position.z * .09;
          const front = position.z >= 0;
          position.project(camera);
          satellite.style.transform = `translate(-50%,-50%) translate3d(${position.x * width / 2}px,${-position.y * height / 2}px,0) scale(${scale})`;
          satellite.style.zIndex = front ? '3' : '1';
          satellite.style.opacity = front ? '1' : '.8';
          satellite.dataset.orbitSide = front ? 'front' : 'back';
        });
        renderer.render(scene, camera);
        if (moving || returning || Math.abs(target.x - current.x) + Math.abs(target.y - current.y) > .001) requestDraw();
        else previousTime = 0;
      }
      invalidate.current = requestDraw;
      const resize = new ResizeObserver(() => {
        width = element!.clientWidth;
        height = element!.clientHeight;
        renderer.setSize(width, height);
        camera.aspect = width / Math.max(height, 1);
        camera.updateProjectionMatrix();
        requestDraw();
      });
      resize.observe(element!);
      const intersection = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        previousTime = 0;
        if (visible) requestDraw();
        else { finishDrag(true); cancelAnimationFrame(frame); frame = 0; }
      });
      intersection.observe(element!);
      const visibility = () => {
        previousTime = 0;
        if (document.hidden) { finishDrag(true); cancelAnimationFrame(frame); frame = 0; }
        else requestDraw();
      };
      const resetPointer = () => { target.x = 0; target.y = 0; requestDraw(); };
      const pointer = (event: PointerEvent) => {
        if (!finePointer.matches || motion.matches || drag.active) return;
        const rect = element!.getBoundingClientRect();
        target.x = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
        target.y = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1));
        requestDraw();
      };
      function finishDrag(reset = false) {
        const id = gesture?.id;
        gesture = null;
        drag.active = false;
        control!.dataset.dragging = 'false';
        if (id !== undefined && control!.hasPointerCapture(id)) control!.releasePointerCapture(id);
        if (reset) resetHeroDragRotation(drag);
        requestDraw();
      }
      const startDrag = (event: PointerEvent) => {
        if (!draggable.matches || event.pointerType === 'touch' || event.button !== 0
          || !event.isPrimary || gesture || !model.children.length || contextLost) return;
        event.preventDefault();
        gesture = { id: event.pointerId, x: event.clientX, y: event.clientY,
          pitch: drag.pitch, yaw: drag.yaw, width: Math.max(element!.clientWidth, 1) };
        setHeroDragRotation(drag, drag.pitch, drag.yaw);
        target.x = 0; target.y = 0;
        control!.setPointerCapture(event.pointerId);
        control!.dataset.dragging = 'true';
        requestDraw();
      };
      const moveDrag = (event: PointerEvent) => {
        if (!gesture || gesture.id !== event.pointerId) return;
        const sensitivity = Math.PI * 2 / gesture.width;
        setHeroDragRotation(drag, gesture.pitch + (event.clientY - gesture.y) * sensitivity,
          gesture.yaw + (event.clientX - gesture.x) * sensitivity);
        requestDraw();
      };
      const endDrag = (event: PointerEvent) => {
        if (gesture?.id === event.pointerId) finishDrag();
      };
      const resetDrag = () => { finishDrag(true); resetPointer(); };
      const rotationKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
      const keyDown = (event: KeyboardEvent) => {
        if (!draggable.matches) return;
        if (rotationKeys.includes(event.key)) {
          event.preventDefault();
          if (gesture) finishDrag(true);
          setHeroDragRotation(drag,
            drag.pitch + (event.key === 'ArrowDown' ? .15 : event.key === 'ArrowUp' ? -.15 : 0),
            drag.yaw + (event.key === 'ArrowRight' ? .2 : event.key === 'ArrowLeft' ? -.2 : 0));
          current.x = 0; current.y = 0; target.x = 0; target.y = 0;
          requestDraw();
        } else if (['Home', 'Escape', 'Enter', ' '].includes(event.key)) {
          event.preventDefault(); resetDrag();
        }
      };
      // Keyboard orientation is immediate; only pointer release uses the spring.
      const keyUp = (event: KeyboardEvent) => {
        if (rotationKeys.includes(event.key)) { event.preventDefault(); resetDrag(); }
      };
      const lost = (event: Event) => {
        event.preventDefault();
        contextLost = true;
        finishDrag(true);
        cancelAnimationFrame(frame); frame = 0;
        setReady(false);
      };
      const restored = () => { contextLost = false; previousTime = 0; setReady(model.children.length > 0); requestDraw(); };
      renderer.domElement.addEventListener('webglcontextlost', lost);
      renderer.domElement.addEventListener('webglcontextrestored', restored);
      element!.addEventListener('pointermove', pointer);
      element!.addEventListener('pointerleave', resetPointer);
      document.addEventListener('visibilitychange', visibility);
      motion.addEventListener('change', resetPointer);
      draggable.addEventListener('change', resetDrag);
      control!.addEventListener('pointerdown', startDrag);
      control!.addEventListener('pointermove', moveDrag);
      control!.addEventListener('pointerup', endDrag);
      control!.addEventListener('pointercancel', endDrag);
      control!.addEventListener('lostpointercapture', endDrag);
      control!.addEventListener('keydown', keyDown);
      control!.addEventListener('keyup', keyUp);
      control!.addEventListener('blur', resetDrag);
      window.addEventListener('blur', resetDrag);

      const disposeMeshes = (object: import('three').Object3D) => {
        object.traverse(child => {
          const mesh = child as import('three').Mesh;
          mesh.geometry?.dispose();
          if (mesh.material) {
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            materials.forEach(material => material.dispose());
          }
        });
      };
      cleanup = () => {
        finishDrag(true);
        invalidate.current = () => {};
        cancelAnimationFrame(frame);
        resize.disconnect(); intersection.disconnect();
        document.removeEventListener('visibilitychange', visibility);
        motion.removeEventListener('change', resetPointer);
        draggable.removeEventListener('change', resetDrag);
        control!.removeEventListener('pointerdown', startDrag);
        control!.removeEventListener('pointermove', moveDrag);
        control!.removeEventListener('pointerup', endDrag);
        control!.removeEventListener('pointercancel', endDrag);
        control!.removeEventListener('lostpointercapture', endDrag);
        control!.removeEventListener('keydown', keyDown);
        control!.removeEventListener('keyup', keyUp);
        control!.removeEventListener('blur', resetDrag);
        window.removeEventListener('blur', resetDrag);
        element!.removeEventListener('pointermove', pointer);
        element!.removeEventListener('pointerleave', resetPointer);
        renderer.domElement.removeEventListener('webglcontextlost', lost);
        renderer.domElement.removeEventListener('webglcontextrestored', restored);
        disposeMeshes(scene);
        environment.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };

      const response = await fetch('/models/rh-monogram.glb', { signal: controller.signal });
      if (!response.ok) throw new Error('RH model could not be loaded');
      const gltf = await new GLTFLoader().parseAsync(await response.arrayBuffer(), '/models/');
      if (disposed) { disposeMeshes(gltf.scene); return; }
      model.add(gltf.scene);
      requestDraw();
      setReady(true);
    }
    setup().catch(() => {
      cleanup();
      if (!disposed) setReady(false);
    });
    return () => { disposed = true; controller.abort(); cleanup(); };
  }, []);

  return (
    <div ref={host} className={styles.scene} data-hero-orbit-scene data-ready={ready}
      onFocusCapture={event => {
        focused.current = event.target instanceof Element && Boolean(event.target.closest('a, [data-hero-drag]'));
        invalidate.current();
      }}
      onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          focused.current = false; invalidate.current();
        }
      }}>
      <div className={styles.fallbackOrbit} aria-hidden="true" />
      <div className={styles.model} data-hero-core aria-hidden="true">
        <Image className={styles.fallback} src="/models/rh-monogram-front.png" alt="" width={900} height={900}
          sizes="(max-width: 760px) 150px, 245px" />
        <div ref={canvasHost} className={styles.canvas} />
      </div>
      <button ref={dragControl} type="button" className={styles.dragControl} data-hero-drag
        aria-label="RHを回す" aria-describedby={dragDescriptionId} disabled={!ready}>
        <span className={styles.dragHint} aria-hidden="true">ドラッグで回転</span>
      </button>
      <span id={dragDescriptionId} className="sr-only">RHの文字をドラッグして回転できます。矢印キーでも向きを変えられます。離すと元の向きに戻ります。</span>
      {apps.map((app, index) => (
        <div key={app.name} ref={node => { satellites.current[index] = node; }}
          className={`${styles.satellite} ${styles[`position${index}`]}`} data-orbit-app={app.name}
          onPointerEnter={event => { if (event.pointerType === 'mouse') { interacting.current = true; invalidate.current(); } }}
          onPointerLeave={() => { interacting.current = false; invalidate.current(); }}>
          <div data-orbit-intro>
            <Link href={app.detailHref ?? '#projects'} className={styles.app}>
              <Image src={app.imageSrc!} alt="" width={112} height={112} sizes="(max-width: 760px) 64px, 112px" priority={index < 2} />
              <span>{app.name}</span>
            </Link>
          </div>
        </div>
      ))}
      <button type="button" className={styles.pause} aria-label={isPaused ? 'アプリの公転を再開' : 'アプリの公転を一時停止'}
        aria-pressed={isPaused} onClick={() => {
          paused.current = !paused.current;
          setIsPaused(paused.current);
          invalidate.current();
        }}>
        {isPaused ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />}
      </button>
    </div>
  );
}
