import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { EnvironmentFrame } from '../../lib/environment';
import { fitShadowBounds } from '../../lib/atmosphere';
import type { Vec3 } from '../../lib/tree';
import useReducedMotion from './useReducedMotion';

export default function EnvironmentSky({ frame, center, radius, treeTop }: { frame: EnvironmentFrame; center: [number, number]; radius: number; treeTop: number }) {
  const reduced = useReducedMotion();
  const { scene } = useThree();
  const sky = useRef<THREE.Mesh>(null!), stars = useRef<THREE.Points>(null!);
  const ambient = useRef<THREE.AmbientLight>(null!), hemi = useRef<THREE.HemisphereLight>(null!), sun = useRef<THREE.DirectionalLight>(null!), fill = useRef<THREE.DirectionalLight>(null!);
  const shadowSignature = useRef('');
  const current = useRef({ daylight: frame.daylight, clouds: frame.cloudCover, rain: frame.rainIntensity, angle: frame.solarAngle });
  const objects = useMemo(() => {
    const starPositions = new Float32Array(Array.from({ length: 512 * 3 }, (_, i) => {
      const r = Math.sin((i + 13) * 127.1) * 43758.5453;
      return (r - Math.floor(r) - .5) * 2;
    }));
    for (let i = 0; i < starPositions.length; i += 3) {
      const length = Math.hypot(starPositions[i], starPositions[i + 1], starPositions[i + 2]);
      for (let j = 0; j < 3; j++) starPositions[i + j] /= length;
    }
    return { background: new THREE.Color(), day: new THREE.Color('#e9eee5'), night: new THREE.Color('#101b2e'), overcast: new THREE.Color('#8c9a9b'), dusk: new THREE.Color('#d1aaa0'), center: new THREE.Vector3(), direction: new THREE.Vector3(), starPositions };
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
    const dt = Math.min(delta, .1), lightStep = reduced || !frame.enabled ? 1 : 1 - Math.exp(-dt * 2), weatherStep = reduced || !frame.enabled ? 1 : 1 - Math.exp(-dt * 1.2);
    current.current.daylight += (frame.daylight - current.current.daylight) * lightStep;
    current.current.clouds += (frame.cloudCover - current.current.clouds) * weatherStep;
    current.current.rain += (frame.rainIntensity - current.current.rain) * weatherStep;
    let angleDifference = frame.solarAngle - current.current.angle;
    if (angleDifference > Math.PI) angleDifference -= Math.PI * 2;
    if (angleDifference < -Math.PI) angleDifference += Math.PI * 2;
    current.current.angle += angleDifference * lightStep;
    const { daylight: day, clouds, rain } = current.current;
    objects.background.copy(objects.night).lerp(objects.day, day);
    if (frame.period === 'dawn' || frame.period === 'dusk') objects.background.lerp(objects.dusk, .22 * (1 - Math.abs(day - .5) * 2));
    objects.background.lerp(objects.overcast, clouds * .24 * day);
    (scene.background as THREE.Color)?.copy(objects.background);
    uniforms.horizon.value.copy(objects.background);
    uniforms.top.value.copy(objects.background).multiplyScalar(frame.period === 'static' ? 1 : .72 + day * .22);
    const distance = camera.position.distanceTo(objects.center.set(center[0], 0, center[1]));
    const skyDistance = Math.min((camera as THREE.PerspectiveCamera).far * .8, Math.max(radius * 10, distance + radius * 8));
    sky.current.position.copy(camera.position); sky.current.scale.setScalar(skyDistance * 1.05);
    const fog = scene.fog as THREE.Fog;
    if (fog) { fog.color.copy(objects.background); fog.near = THREE.MathUtils.lerp(distance + radius * 2, Math.max(1, distance - radius * 1.5), rain * .35); fog.far = distance + radius * 6; }
    ambient.current.intensity = .3 + day * .5;
    hemi.current.intensity = .6 + day;
    sun.current.intensity = (.12 + day * 2.38) * (1 - clouds * .55);
    sun.current.color.set(frame.period === 'dawn' || frame.period === 'dusk' ? '#ffd0a0' : day < .7 ? '#c8d8f5' : '#fff1cf');
    const span = radius + 6;
    const lightDistance = Math.max(40, Math.hypot(span, treeTop + 8) * 3);
    if (frame.period === 'static') objects.direction.set(-8, 14, 5).normalize();
    else objects.direction.set(-Math.cos(current.current.angle) * 2, 1.5 + Math.abs(Math.sin(current.current.angle)), 1).normalize();
    sun.current.position.copy(objects.center).addScaledVector(objects.direction, lightDistance);
    const signature = [center[0], center[1], radius, treeTop, Math.round(current.current.angle * 1000), frame.period === 'static'].join(':');
    if (signature !== shadowSignature.current) {
      sun.current.updateMatrixWorld(); sun.current.shadow.updateMatrices(sun.current);
      const corners: Vec3[] = [];
      for (const x of [center[0] - span, center[0] + span]) for (const y of [-Math.max(16, radius * .8), treeTop + 2]) for (const z of [center[1] - span, center[1] + span]) corners.push([x, y, z]);
      Object.assign(sun.current.shadow.camera, fitShadowBounds(corners, sun.current.shadow.camera.matrixWorldInverse.elements));
      sun.current.shadow.camera.updateProjectionMatrix(); shadowSignature.current = signature;
    }
    fill.current.intensity = .3 + day * .35;
    stars.current.position.copy(camera.position); stars.current.quaternion.copy(camera.quaternion); stars.current.scale.setScalar(skyDistance);
    (stars.current.material as THREE.PointsMaterial).opacity = frame.period === 'static' ? 0 : (1 - day) * (1 - clouds) * .7;
  });
  return <>
    <mesh ref={sky} raycast={() => {}} renderOrder={-100}>
      <sphereGeometry args={[1, 24, 16]} />
      <shaderMaterial side={THREE.BackSide} depthWrite={false} uniforms={uniforms} vertexShader={'varying float height; void main(){ height=position.y; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }'} fragmentShader={'uniform vec3 top; uniform vec3 horizon; varying float height; void main(){ gl_FragColor=vec4(mix(horizon,top,smoothstep(-0.3,0.8,height)),1.0); #include <colorspace_fragment> }'.replace(' #include', '\n#include')} />
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

