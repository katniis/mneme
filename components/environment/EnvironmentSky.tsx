'use client';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { environmentRanges, fogRange, type EnvironmentFrame } from '../../lib/environment';
import { random } from '../../lib/tree';
import CelestialBodies from './CelestialBodies';

const DAY = { top: new THREE.Color('#a8c6e8'), bottom: new THREE.Color('#e9eee5'), sun: new THREE.Color('#fff1cf'), hemiSky: new THREE.Color('#fff4d9'), hemiGround: new THREE.Color('#a5b19f') };
const NIGHT = { top: new THREE.Color('#0b1526'), bottom: new THREE.Color('#101b2e'), sun: new THREE.Color('#ffb36b'), hemiSky: new THREE.Color('#33415e'), hemiGround: new THREE.Color('#1c2620') };
const WARM = new THREE.Color('#f2c98a');

const vertexShader = `
varying vec3 vDirection;
void main() {
  vDirection = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const fragmentShader = `
uniform vec3 topColor;
uniform vec3 bottomColor;
varying vec3 vDirection;
void main() {
  float height = normalize(vDirection).y;
  float mixValue = pow(max(height, 0.0), 0.55);
  gl_FragColor = vec4(mix(bottomColor, topColor, mixValue), 1.0);
}
`;

export default function EnvironmentSky({ frame, center, radius }: { frame: EnvironmentFrame; center: [number, number]; radius: number }) {
  const { scene, camera } = useThree();
  const dome = useRef<THREE.Mesh>(null!);
  const material = useRef<THREE.ShaderMaterial>(null!);
  const ambient = useRef<THREE.AmbientLight>(null!);
  const hemi = useRef<THREE.HemisphereLight>(null!);
  const sun = useRef<THREE.DirectionalLight>(null!);
  const moon = useRef<THREE.DirectionalLight>(null!);
  const stars = useRef<THREE.Points>(null!);
  const clouds = useRef<THREE.InstancedMesh>(null!);
  const ranges = environmentRanges(radius);
  const reduced = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const sunTarget = useMemo(() => new THREE.Object3D(), []);
  const moonTarget = useMemo(() => new THREE.Object3D(), []);
  const fog = useMemo(() => new THREE.Fog('#e9eee5', 80, 190), []);
  const centerVec = useMemo(() => new THREE.Vector3(center[0], 0, center[1]), [center[0], center[1]]);
  const starPositions = useMemo(() => {
    const rng = random(9182);
    const positions = new Float32Array(512 * 3);
    for (let i = 0; i < 512; i++) {
      const angle = rng() * Math.PI * 2;
      const y = 0.08 + rng() * 0.9;
      const ring = Math.sqrt(Math.max(0, 1 - y * y));
      positions.set([Math.cos(angle) * ring, y, Math.sin(angle) * ring], i * 3);
    }
    return positions;
  }, []);
  const cloudSeeds = useMemo(() => {
    const rng = random(4411);
    return Array.from({ length: 12 }, () => ({ angle: rng() * Math.PI * 2, distance: 0.35 + rng() * 0.75, height: 1.4 + rng() * 1.1, scale: 2 + rng() * 2.2, speed: 0.004 + rng() * 0.008 }));
  }, []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useEffect(() => {
    if (sun.current) sun.current.target = sunTarget;
    if (moon.current) moon.current.target = moonTarget;
  }, [sunTarget, moonTarget]);
  const targets = useMemo(() => {
    const daylight = frame.period === 'static' ? 1 : frame.daylight;
    const top = NIGHT.top.clone().lerp(DAY.top, daylight);
    const bottom = NIGHT.bottom.clone().lerp(DAY.bottom, daylight);
    if (frame.period === 'dawn' || frame.period === 'dusk') {
      const warm = Math.max(0, 1 - Math.abs(daylight - 0.5) * 2) * 0.45;
      bottom.lerp(WARM, warm);
      top.lerp(WARM, warm * 0.3);
    }
    const cloudDim = 1 - frame.cloudCover * 0.5;
    return {
      top,
      bottom,
      sunColor: DAY.sun.clone().lerp(NIGHT.sun, frame.period === 'dawn' || frame.period === 'dusk' ? 0.65 : 0),
      hemiSky: NIGHT.hemiSky.clone().lerp(DAY.hemiSky, daylight),
      hemiGround: NIGHT.hemiGround.clone().lerp(DAY.hemiGround, daylight),
      ambient: (0.35 + daylight * 0.45) * (1 - frame.cloudCover * 0.15),
      hemi: 0.35 + daylight * 1.25,
      sun: 2.5 * daylight * cloudDim,
      moon: 0.55 * (1 - daylight),
      stars: frame.period === 'night' ? (1 - frame.cloudCover) * 0.9 : 0,
      clouds: frame.cloudCover,
    };
  }, [frame]);

  const settled = useRef(false);
  useFrame((_, delta) => {
    const real = Math.min(delta, 1);
    const skyAlpha = reduced || !settled.current ? 1 : 1 - Math.exp(-real * 1.1);
    const weatherAlpha = reduced || !settled.current ? 1 : 1 - Math.exp(-real * 0.65);
    settled.current = true;
    if (material.current) {
      (material.current.uniforms.topColor.value as THREE.Color).lerp(targets.top, skyAlpha);
      (material.current.uniforms.bottomColor.value as THREE.Color).lerp(targets.bottom, skyAlpha);
    }
    if (dome.current) {
      dome.current.position.copy(camera.position);
      dome.current.scale.setScalar(ranges.skyDistance);
    }
    scene.fog = fog;
    fog.color.lerp(targets.bottom, skyAlpha);
    const cameraDistance = camera.position.distanceTo(centerVec);
    const range = fogRange(cameraDistance, radius, frame.rainIntensity);
    fog.near += (range.near - fog.near) * weatherAlpha;
    fog.far += (range.far - fog.far) * weatherAlpha;
    if (ambient.current) ambient.current.intensity += (targets.ambient - ambient.current.intensity) * skyAlpha;
    if (hemi.current) {
      hemi.current.intensity += (targets.hemi - hemi.current.intensity) * skyAlpha;
      hemi.current.color.lerp(targets.hemiSky, skyAlpha);
      hemi.current.groundColor.lerp(targets.hemiGround, skyAlpha);
    }
    const sunAngle = frame.period === 'static' ? Math.PI / 3 : frame.solarAngle;
    const sunDir = new THREE.Vector3(Math.cos(sunAngle), Math.max(0.12, Math.sin(sunAngle)), -0.35).normalize();
    if (sun.current) {
      sun.current.position.copy(centerVec).addScaledVector(sunDir, radius * 4);
      sun.current.intensity += (targets.sun - sun.current.intensity) * skyAlpha;
      sun.current.color.lerp(targets.sunColor, skyAlpha);
    }
    sunTarget.position.copy(centerVec);
    const moonDir = new THREE.Vector3(-sunDir.x, Math.max(0.15, -Math.sin(sunAngle) + 0.55), 0.3).normalize();
    if (moon.current) {
      moon.current.position.copy(centerVec).addScaledVector(moonDir, radius * 4);
      moon.current.intensity += (targets.moon - moon.current.intensity) * skyAlpha;
    }
    moonTarget.position.copy(centerVec);
    if (stars.current) {
      stars.current.position.copy(camera.position);
      const starMaterial = stars.current.material as THREE.PointsMaterial;
      const goal = targets.stars;
      starMaterial.opacity += (goal - starMaterial.opacity) * weatherAlpha;
      stars.current.visible = starMaterial.opacity > 0.02;
    }
    if (clouds.current) {
      const time = reduced ? 0 : performance.now() / 1000;
      cloudSeeds.forEach((seed, i) => {
        const angle = seed.angle + time * seed.speed;
        dummy.position.set(center[0] + Math.cos(angle) * radius * seed.distance * 2.2, radius * seed.height, center[1] + Math.sin(angle) * radius * seed.distance * 2.2);
        dummy.lookAt(camera.position);
        dummy.scale.set(radius * seed.scale, radius * seed.scale * 0.32, 1);
        dummy.updateMatrix();
        clouds.current.setMatrixAt(i, dummy.matrix);
      });
      clouds.current.instanceMatrix.needsUpdate = true;
      const cloudMaterial = clouds.current.material as THREE.MeshBasicMaterial;
      const goal = targets.clouds * 0.42;
      cloudMaterial.opacity += (goal - cloudMaterial.opacity) * weatherAlpha;
      clouds.current.visible = cloudMaterial.opacity > 0.01;
    }
  });

  return (
    <>
      <mesh ref={dome} frustumCulled={false} renderOrder={-10}>
        <sphereGeometry args={[1, 32, 20]} />
        <shaderMaterial ref={material} vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={{ topColor: { value: targets.top.clone() }, bottomColor: { value: targets.bottom.clone() } }} side={THREE.BackSide} depthWrite={false} fog={false} />
      </mesh>
      <points ref={stars} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[starPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#e8efff" size={1.8} sizeAttenuation={false} transparent opacity={0} depthWrite={false} fog={false} />
      </points>
      <instancedMesh ref={clouds} args={[undefined, undefined, 12]} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0} depthWrite={false} fog={false} />
      </instancedMesh>
      <ambientLight ref={ambient} intensity={0.8} />
      <hemisphereLight ref={hemi} args={['#fff4d9', '#a5b19f', 1.6]} />
      <directionalLight ref={sun} intensity={2.5} color="#fff1cf" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-ranges.shadowExtent} shadow-camera-right={ranges.shadowExtent} shadow-camera-top={ranges.shadowExtent} shadow-camera-bottom={-ranges.shadowExtent} shadow-camera-far={ranges.shadowFar} shadow-bias={-0.0004} shadow-normalBias={0.04} />
      <primitive object={sunTarget} />
      <directionalLight ref={moon} intensity={0} color="#bcd0ff" />
      <primitive object={moonTarget} />
      {frame.period !== 'static' && <CelestialBodies solarAngle={frame.solarAngle} daylight={frame.daylight} center={center} radius={radius} />}
    </>
  );
}
