import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { EnvironmentFrame } from '../../lib/environment';
import CelestialBodies from './CelestialBodies';
import useReducedMotion from './useReducedMotion';

export default function EnvironmentSky({ frame, center, radius }: { frame: EnvironmentFrame; center: [number, number]; radius: number }) {
  const reduced = useReducedMotion();
  const { scene } = useThree();
  const sky = useRef<THREE.Mesh>(null!), stars = useRef<THREE.Points>(null!);
  const ambient = useRef<THREE.AmbientLight>(null!), hemi = useRef<THREE.HemisphereLight>(null!), sun = useRef<THREE.DirectionalLight>(null!), fill = useRef<THREE.DirectionalLight>(null!);
  const cloud = useRef<THREE.InstancedMesh>(null!);
  const current = useRef({ daylight: frame.daylight, clouds: frame.cloudCover, rain: frame.rainIntensity });
  const objects = useMemo(() => ({ background: new THREE.Color(), top: new THREE.Color(), horizon: new THREE.Color(), day: new THREE.Color('#e9eee5'), night: new THREE.Color('#101b2e'), overcast: new THREE.Color('#8c9a9b'), dusk: new THREE.Color('#d1aaa0'), dummy: new THREE.Object3D(), starPositions: new Float32Array(Array.from({ length: 512 * 3 }, (_, i) => { const r = Math.sin((i + 13) * 127.1) * 43758.5453; return (r - Math.floor(r) - .5) * 2; })) }), []);
  for (let i = 0; i < objects.starPositions.length; i += 3) {
    const length = Math.hypot(objects.starPositions[i], objects.starPositions[i + 1], objects.starPositions[i + 2]);
    for (let j = 0; j < 3; j++) objects.starPositions[i + j] /= length;
  }
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
    const camera = sun.current.shadow.camera;
    camera.left = camera.bottom = -(radius + 6); camera.right = camera.top = radius + 6;
    camera.far = Math.max(200, radius * 16); camera.updateProjectionMatrix();
  }, [center, radius]);
  useFrame(({ camera }, delta) => {
    if (document.hidden) return;
    const dt = Math.min(delta, .1), lightStep = reduced || !frame.enabled ? 1 : 1 - Math.exp(-dt * 2), weatherStep = reduced || !frame.enabled ? 1 : 1 - Math.exp(-dt * 1.2);
    current.current.daylight += (frame.daylight - current.current.daylight) * lightStep;
    current.current.clouds += (frame.cloudCover - current.current.clouds) * weatherStep;
    current.current.rain += (frame.rainIntensity - current.current.rain) * weatherStep;
    const { daylight: day, clouds, rain } = current.current;
    objects.background.copy(objects.night).lerp(objects.day, day);
    if (frame.period === 'dawn' || frame.period === 'dusk') objects.background.lerp(objects.dusk, .22 * (1 - Math.abs(day - .5) * 2));
    objects.background.lerp(objects.overcast, clouds * .24 * day);
    (scene.background as THREE.Color)?.copy(objects.background);
    uniforms.horizon.value.copy(objects.background);
    uniforms.top.value.copy(objects.background).multiplyScalar(frame.period === 'static' ? 1 : .72 + day * .22);
    sky.current.position.copy(camera.position); sky.current.scale.setScalar(radius * 12);
    const distance = camera.position.distanceTo(new THREE.Vector3(center[0], 0, center[1]));
    const fog = scene.fog as THREE.Fog;
    if (fog) { fog.color.copy(objects.background); fog.near = THREE.MathUtils.lerp(distance + radius * 2, Math.max(1, distance - radius * 1.5), rain * .35); fog.far = distance + radius * 6; }
    ambient.current.intensity = .3 + day * .5;
    hemi.current.intensity = .6 + day;
    sun.current.intensity = (.12 + day * 2.38) * (1 - clouds * .55);
    sun.current.color.set(day < .7 ? '#c8d8f5' : '#fff1cf');
    if (frame.period === 'static') sun.current.position.set(-8, 14, 5);
    else sun.current.position.set(center[0] - Math.cos(frame.solarAngle) * radius * 2, radius * (1.5 + Math.abs(Math.sin(frame.solarAngle))), center[1] + radius);
    fill.current.intensity = .3 + day * .35;
    stars.current.position.copy(camera.position); stars.current.quaternion.copy(camera.quaternion); stars.current.scale.setScalar(radius * 10);
    (stars.current.material as THREE.PointsMaterial).opacity = frame.period === 'static' ? 0 : (1 - day) * (1 - clouds) * .7;
    const time = reduced ? 0 : performance.now() / 1000;
    for (let i = 0; i < 12; i++) {
      objects.dummy.position.set(center[0] + Math.sin(i * 2.4 + time * .006) * radius * 1.3, 10 + radius * .45 + i % 3, center[1] + Math.cos(i * 2.4 + time * .006) * radius);
      objects.dummy.scale.set(radius * .35, .15 + radius * .035, radius * .2); objects.dummy.updateMatrix(); cloud.current.setMatrixAt(i, objects.dummy.matrix);
    }
    cloud.current.instanceMatrix.needsUpdate = true;
    (cloud.current.material as THREE.MeshBasicMaterial).opacity = clouds * (.1 + day * .08);
    cloud.current.visible = frame.enabled && clouds > .01;
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
    <instancedMesh ref={cloud} args={[undefined, undefined, 12]} raycast={() => {}} frustumCulled={false}>
      <sphereGeometry args={[1, 12, 6]} /><meshBasicMaterial color="#abb8b5" transparent depthWrite={false} />
    </instancedMesh>
    {frame.period !== 'static' && <CelestialBodies solarAngle={frame.solarAngle} daylight={frame.daylight} radius={radius} reduced={reduced} />}
  </>;
}

