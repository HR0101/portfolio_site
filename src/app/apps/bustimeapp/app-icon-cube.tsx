"use client";

import { useEffect, useRef, useState } from 'react';
import { subscribeToScroll } from '../../../lib/scrollObserver';
import styles from './product.module.css';

export function AppIconCube() {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    async function setup() {
      const [THREE, { RoundedBoxGeometry }, { RoomEnvironment }] = await Promise.all([
        import('three'),
        import('three/addons/geometries/RoundedBoxGeometry.js'),
        import('three/addons/environments/RoomEnvironment.js'),
      ]);
      if (disposed || !host.current) return;
      const element = host.current;
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.35;
      element.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 30);
      camera.position.set(0, 0, 7.8);
      const environment = new RoomEnvironment();
      const pmrem = new THREE.PMREMGenerator(renderer);
      const environmentMap = pmrem.fromScene(environment, 0.04);
      scene.environment = environmentMap.texture;
      environment.dispose();
      pmrem.dispose();
      const geometry = new RoundedBoxGeometry(2.5, 2.5, 2.5, 8, 0.22);
      const material = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, roughness: 0.3, metalness: 0.02,
        clearcoat: 0.7, clearcoatRoughness: 0.23, envMapIntensity: 0.8,
      });
      const cube = new THREE.Mesh(geometry, material);
      scene.add(cube);
      const key = new THREE.DirectionalLight(0xfff5e8, 3);
      key.position.set(-3, 5, 5);
      scene.add(key, new THREE.HemisphereLight(0xdcefff, 0x718fac, 1.8));
      let frame = 0;
      let target = 0;
      let current = 0;
      const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
      function draw() {
        frame = 0;
        current = motion.matches ? 0 : current + (target - current) * 0.13;
        cube.rotation.set(0.27 + current * 1.5, -0.48 + current * 3.8, -0.07 + current * 0.16);
        renderer.render(scene, camera);
        if (!motion.matches && Math.abs(target - current) > 0.0001) frame = requestAnimationFrame(draw);
      }
      function requestDraw() { if (!frame) frame = requestAnimationFrame(draw); }
      const resize = new ResizeObserver(() => {
        const { width, height } = element.getBoundingClientRect();
        renderer.setSize(width, height);
        camera.aspect = width / Math.max(height, 1);
        camera.updateProjectionMatrix();
        requestDraw();
      });
      resize.observe(element);
      const unsubscribe = subscribeToScroll(() => {
        target = Math.min(window.scrollY / Math.max(window.innerHeight, 600), 2);
        requestDraw();
      });
      motion.addEventListener('change', requestDraw);
      const onContextLost = (event: Event) => { event.preventDefault(); setReady(false); };
      const onContextRestored = () => { setReady(true); requestDraw(); };
      renderer.domElement.addEventListener('webglcontextlost', onContextLost);
      renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);
      const texture = new THREE.TextureLoader().load('/projects/bustimeapp.webp', () => {
        if (disposed) return;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
        material.map = texture;
        material.needsUpdate = true;
        requestDraw();
        setReady(true);
      });
      cleanup = () => {
        cancelAnimationFrame(frame);
        resize.disconnect(); unsubscribe();
        motion.removeEventListener('change', requestDraw);
        renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
        renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
        geometry.dispose(); material.dispose(); texture.dispose(); environmentMap.dispose();
        renderer.dispose(); renderer.domElement.remove();
      };
    }
    setup().catch(() => { if (!disposed) setReady(false); });
    return () => { disposed = true; cleanup(); };
  }, []);

  return (
    <div className={styles.cubeStage}>
      <div className={styles.cubeOrbit} aria-hidden="true" />
      <div ref={host} className={styles.cubeCanvas} role="img" aria-label="丸みのあるBusTimeAppの3Dキューブ" data-ready={ready}>
        {!ready && <img className={styles.cubeFallback} src="/projects/bustimeapp.webp" width={240} height={240} alt="" />}
      </div>
      <div className={styles.cubeGround} aria-hidden="true" />
    </div>
  );
}
