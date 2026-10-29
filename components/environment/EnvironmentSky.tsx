import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { EnvironmentFrame } from '../../lib/environment';
import { fitShadowBounds } from '../../lib/atmosphere';
import { sampleDaylight, easeDaylight, type DaylightAppearance, type RGB } from '../../lib/daylight';
import type { Vec3 } from '../../lib/tree';
import useReducedMotion from './useReducedMotion';

function blendColour(colour: THREE.Color, clear: RGB, overcast: RGB, clouds: number) {
  colour.setRGB(
    THREE.MathUtils.lerp(clear[0], overcast[0], clouds),
    THREE.MathUtils.lerp(clear[1], overcast[1], clouds),
    THREE.MathUtils.lerp(clear[2], overcast[2], clouds),
    THREE.LinearSRGBColorSpace,
  );
}

export default function EnvironmentSky({ frame, center, radius, treeTop }: { frame: EnvironmentFrame; center: [number, number]; radius: number; treeTop: number }) {
  const reduced = useReducedMotion();
  const { scene } = useThree();
  const sky = useRef<THREE.Mesh>(null!), stars = useRef<THREE.Points>(null!);
  const ambient = useRef<THREE.AmbientLight>(null!), hemi = useRef<THREE.HemisphereLight>(null!), sun = useRef<THREE.DirectionalLight>(null!), fill = useRef<THREE.DirectionalLight>(null!);
  const shadowSignature = useRef('');
  const targets = useMemo(() => ({
    clear: sampleDaylight({ period: frame.period, solarAngle: frame.solarAngle, daylight: frame.daylight, cloudCover: 0 }),
    overcast: sampleDaylight({ period: frame.period, solarAngle: frame.solarAngle, daylight: frame.daylight, cloudCover: 1 }),
  }), [frame.period, frame.solarAngle, frame.daylight]);
  const current = useRef<{ clear: DaylightAppearance; overcast: DaylightAppearance; clouds: number; rain: number } | null>(null);
  if (!current.current) current.current = { clear: structuredClone(targets.clear), overcast: structuredClone(targets.overcast), clouds: frame.cloudCover, rain: frame.rainIntensity };
  const lighting = current.current;
  const corners = useMemo(() => {
    const points: Vec3[] = [], span = radius + 6;
    for (const x of [center[0] - span, center[0] + span]) for (const y of [-Math.max(16, radius * .8), treeTop + 2]) for (const z of [center[1] - span, center[1] + span]) points.push([x, y, z]);
    return points;
  }, [center[0], center[1], radius, treeTop]);
  const objects = useMemo(() => {
    const starPositions = new Float32Array(Array.from({ length: 512 * 3 }, (_, i) => {
      const r = Math.sin((i + 13) * 127.1) * 43758.5453;
      return (r - Math.floor(r) - .5) * 2;
    }));
    for (let i = 0; i < starPositions.length; i += 3) {
      const length = Math.hypot(starPositions[i], starPositions[i + 1], starPositions[i + 2]);
      for (let j = 0; j < 3; j++) starPositions[i + j] /= length;
    }
    return { background: new THREE.Color(), center: new THREE.Vector3(), direction: new THREE.Vector3(), starPositions };
  }, []);
  const uniforms = useMemo(() => ({ top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() } }), []);
  useEffect(() => {
    const background = new THREE.Color(), fog = new THREE.Fog('#e9eee5', 80, 190);
    const oldBackground = scene.background, oldFog = scene.fog;
    scene.background = background; scene.fog = fog;
    return () => { scene.background = oldBackground; scene.fog = oldFog; };
  }, [scene]);
  useEffect(() => {
    sun.current.target.position.set(center[0], 0, center[1]);
    sun.current.target.updateMatrixWorld();
  }, [center]);
  useFrame(({ camera }, delta) => {
    if (document.hidden) return;
    const immediate = reduced || !frame.enabled;
    const weatherStep = immediate ? 1 : 1 - Math.exp(-Math.min(delta, .1) * 1.2);
    easeDaylight(lighting.clear, targets.clear, delta, immediate);
    easeDaylight(lighting.overcast, targets.overcast, delta, immediate);
    lighting.clouds += (frame.cloudCover - lighting.clouds) * weatherStep;
    lighting.rain += (frame.rainIntensity - lighting.rain) * weatherStep;
    const { clear, overcast, clouds, rain } = lighting;
    blendColour(objects.background, clear.horizon, overcast.horizon, clouds);
    (scene.background as THREE.Color)?.copy(objects.background);
    uniforms.horizon.value.copy(objects.background);
    blendColour(uniforms.top.value, clear.skyTop, overcast.skyTop, clouds);
    const distance = camera.position.distanceTo(objects.center.set(center[0], 0, center[1]));
    const skyDistance = Math.min((camera as THREE.PerspectiveCamera).far * .8, Math.max(radius * 10, distance + radius * 8));
    sky.current.position.copy(camera.position); sky.current.scale.setScalar(skyDistance * 1.05);
    const fog = scene.fog as THREE.Fog;
    if (fog) { fog.color.copy(objects.background); fog.near = THREE.MathUtils.lerp(distance + radius * 2, Math.max(1, distance - radius * 1.5), rain * .35); fog.far = distance + radius * 6; }
    ambient.current.intensity = THREE.MathUtils.lerp(clear.ambient, overcast.ambient, clouds);
    hemi.current.intensity = THREE.MathUtils.lerp(clear.hemisphere, overcast.hemisphere, clouds);
    blendColour(hemi.current.color, clear.hemisphereSky, overcast.hemisphereSky, clouds);
    blendColour(hemi.current.groundColor, clear.hemisphereGround, overcast.hemisphereGround, clouds);
    sun.current.intensity = THREE.MathUtils.lerp(clear.key, overcast.key, clouds);
    blendColour(sun.current.color, clear.keyColour, overcast.keyColour, clouds);
    const span = radius + 6;
    const lightDistance = Math.max(40, Math.hypot(span, treeTop + 8) * 3);
    objects.direction.fromArray(clear.direction);
    sun.current.position.copy(objects.center).addScaledVector(objects.direction, lightDistance);
    const signature = [center[0], center[1], radius, treeTop, Math.round(objects.direction.x * 10000), Math.round(objects.direction.y * 10000), Math.round(objects.direction.z * 10000)].join(':');
    if (signature !== shadowSignature.current) {
      sun.current.updateMatrixWorld(); sun.current.shadow.updateMatrices(sun.current);
      Object.assign(sun.current.shadow.camera, fitShadowBounds(corners, sun.current.shadow.camera.matrixWorldInverse.elements));
      sun.current.shadow.camera.updateProjectionMatrix(); shadowSignature.current = signature;
    }
    fill.current.intensity = THREE.MathUtils.lerp(clear.fill, overcast.fill, clouds);
    blendColour(fill.current.color, clear.fillColour, overcast.fillColour, clouds);
    stars.current.position.copy(camera.position); stars.current.quaternion.copy(camera.quaternion); stars.current.scale.setScalar(skyDistance);
    (stars.current.material as THREE.PointsMaterial).opacity = THREE.MathUtils.lerp(clear.stars, overcast.stars, clouds);
  });
  return <>
    <mesh ref={sky} raycast={() => {}} renderOrder={-100}>
      <sphereGeometry args={[1, 24, 16]} />
      <shaderMaterial side={THREE.BackSide} depthWrite={false} uniforms={uniforms} vertexShader={'varying vec3 worldDirection; void main(){ worldDirection=mat3(modelMatrix)*position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }'} fragmentShader={'uniform vec3 top; uniform vec3 horizon; varying vec3 worldDirection; void main(){ float height=normalize(worldDirection).y; gl_FragColor=vec4(mix(horizon,top,smoothstep(-0.3,0.8,height)),1.0); #include <colorspace_fragment> }'.replace(' #include', '\n#include')} />
    </mesh>
    <ambientLight ref={ambient} intensity={.8} />
    <hemisphereLight ref={hemi} args={['#fff4d9', '#a5b19f', 1.6]} />
    <directionalLight ref={sun} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-.0004} shadow-normalBias={.04} />
    <directionalLight ref={fill} position={[8, -6, 8]} color="#dce7d7" />
    <points ref={stars} raycast={() => {}} frustumCulled={false}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[objects.starPositions, 3]} /></bufferGeometry>
      <pointsMaterial size={1.5} sizeAttenuation={false} color="#dce7f5" transparent depthWrite={false} fog={false} />
    </points>
  </>;
}

