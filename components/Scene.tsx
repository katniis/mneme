'use client';
import { useMemo, useRef, useEffect, useLayoutEffect, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';
import { generateTree, elementProgress, random, type Voxel } from '../lib/tree';
import { generateTerrain, groundHeight, type Position } from '../lib/terrain';
import { progress, type GardenState, type Letter } from '../lib/garden';

type Props = { letters: Letter[]; clock: MutableRefObject<GardenState>; selected: string | null; onSelect: (id: string) => void; recenter: number; editing: boolean; onInteraction: () => void; onReady: () => void };

function usePixelTexture() {
  const texture = useMemo(() => {
    const rng = random(315);
    const size = 16, data = new Uint8Array(size * size * 4);
    for (let i = 0; i < size * size; i++) {
      const light = 220 + Math.floor(rng() * 35);
      data.set([light, light, light, 255], i * 4);
    }
    const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
    t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true;
    return t;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function Terrain({ positions }: { positions: Position[] }) {
  const data = useMemo(() => generateTerrain(positions), [positions]);
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const oldKeys = useRef(new Set<string>());
  const arrivals = useRef(new Map<string, number>());
  const started = useRef(0);
  const dirty = useRef(true);
  const texture = usePixelTexture();
  useLayoutEffect(() => {
    const time = performance.now() / 1000;
    data.forEach((v, i) => {
      mesh.current.setColorAt(i, new THREE.Color(v.color));
      if (started.current && !oldKeys.current.has(v.key)) {
        const center = positions[Math.max(0, v.birth - 1)] || [0, 0];
        const distance = Math.hypot(v.position[0] - center[0], v.position[2] - center[1]);
        const layer = v.kind === 'stone' || v.kind === 'mineral' ? Number(v.key.match(/\d+$/)![0]) : -1;
        const column = v.key.slice(0, v.key.lastIndexOf(':'));
        const parent = v.kind === 'mineral' ? `${column}:stone${layer}` : layer === 0 ? `${column}:soil` : `${column}:stone${layer - 1}`;
        const parentArrival = layer >= 0 ? arrivals.current.get(parent) : undefined;
        arrivals.current.set(v.key, Math.max(time + Math.min(.6, distance * .065), parentArrival === undefined ? time : parentArrival + .65));
      }
    });
    oldKeys.current = new Set(data.map(v => v.key));
    started.current = time;
    dirty.current = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  }, [data, positions]);
  useFrame(() => {
    if (!dirty.current && !arrivals.current.size) return;
    let changing = false;
    const now = performance.now() / 1000;
    data.forEach((v, i) => {
      const arrived = arrivals.current.get(v.key);
      const t = arrived === undefined ? 1 : THREE.MathUtils.clamp((now - arrived) / .65, 0, 1);
      const smooth = t * t * (3 - 2 * t);
      const y = v.kind === 'stone' ? v.position[1] + v.size[1] * (1 - smooth) / 2 : v.position[1] - (1 - smooth) * .35;
      dummy.position.set(v.position[0], y, v.position[2]);
      dummy.scale.set(v.size[0] * Math.max(.001, smooth), v.size[1] * Math.max(.001, smooth), v.size[2] * Math.max(.001, smooth));
      dummy.updateMatrix(); mesh.current.setMatrixAt(i, dummy.matrix);
      if (t < 1) changing = true; else arrivals.current.delete(v.key);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (!changing && arrivals.current.size) arrivals.current.clear();
    dirty.current = changing;
  });
  return <instancedMesh ref={mesh} args={[undefined, undefined, data.length]} castShadow receiveShadow frustumCulled={false}>
    <boxGeometry /><meshStandardMaterial map={texture} roughness={1} />
  </instancedMesh>;
}

function Tree({ letter, data, clock, selected, onSelect }: { letter: Letter; data: Voxel[]; clock: Props['clock']; selected: boolean; onSelect: Props['onSelect'] }) {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const lastProgress = useRef(-1);
  const born = useRef(performance.now());
  const texture = usePixelTexture();
  useLayoutEffect(() => {
    data.forEach((v, i) => mesh.current.setColorAt(i, new THREE.Color(v.color)));
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  }, [data]);
  useFrame(() => {
    const p = progress(letter, clock.current.time);
    const waiting = performance.now() - born.current < 1400 && p < .05;
    const value = waiting ? 0 : Math.max(.035, p);
    if (lastProgress.current === value) return;
    lastProgress.current = value;
    data.forEach((v, i) => {
      const g = elementProgress(v, value);
      dummy.position.set(...v.position.map((n, axis) => v.anchor[axis] + (n - v.anchor[axis]) * g) as [number, number, number]);
      const girth = v.kind === 'wood' && v.size[0] > .22 ? .25 + .75 * Math.min(1, value / .5) : 1;
      dummy.scale.set(v.size[0] * g * girth, v.size[1] * g, v.size[2] * g * girth);
      dummy.updateMatrix(); mesh.current.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  const choose = (e: ThreeEvent<MouseEvent>) => { if (e.delta <= 5) { e.stopPropagation(); onSelect(letter.id); } };
  return <group position={[letter.position[0], groundHeight(...letter.position), letter.position[1]]}>
    <instancedMesh ref={mesh} args={[undefined, undefined, data.length]} castShadow receiveShadow frustumCulled={false}
      onClick={choose} onPointerOver={e => { e.stopPropagation(); document.body.dataset.treeHover = 'true'; }} onPointerOut={() => { delete document.body.dataset.treeHover; }}>
      <boxGeometry /><meshStandardMaterial map={texture} roughness={1} />
    </instancedMesh>
    {selected && <mesh position={[0, .015, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.61, .65, 32]} /><meshBasicMaterial color="#d4dfb5" side={THREE.DoubleSide} /></mesh>}
  </group>;
}

function CameraRig({ radius, center, height, recenter, editing, onInteraction }: { radius: number; center: [number, number]; height: number; recenter: number; editing: boolean; onInteraction: () => void }) {
  const controls = useRef<OrbitControlsType>(null!);
  const { camera, size } = useThree();
  const destination = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  const first = useRef(true);
  useEffect(() => {
    const mobile = size.width < 700;
    const distance = Math.max(height ? (mobile ? 30 : Math.max(24, height * 2.8)) : 16.5, radius * Math.max(3.1, size.height / size.width * 3.8));
    const target = new THREE.Vector3(center[0], height ? (height - 4.5) / 2 : mobile ? -2.5 : -1, center[1]);
    const offset = new THREE.Vector3(1.05, .85, 1.3).normalize().multiplyScalar(distance);
    if (first.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      camera.position.copy(target).add(offset); controls.current.target.copy(target); controls.current.update(); first.current = false;
    } else destination.current = { position: target.clone().add(offset), target };
  }, [radius, center[0], center[1], height, recenter, size.width, size.height, camera]);
  useFrame((_, delta) => {
    if (destination.current && !editing) {
      camera.position.lerp(destination.current.position, 1 - Math.exp(-delta * 3));
      controls.current.target.lerp(destination.current.target, 1 - Math.exp(-delta * 3));
      controls.current.update();
      if (camera.position.distanceTo(destination.current.position) < .01) destination.current = null;
    }
    const targetY = height ? (height - 4.5) / 2 : size.width < 700 ? -2.5 : -1;
    const offset = controls.current.target.clone().sub(new THREE.Vector3(center[0], targetY, center[1]));
    if (offset.length() > radius * .7) controls.current.target.copy(offset.setLength(radius * .7).add(new THREE.Vector3(center[0], targetY, center[1])));
  });
  return <OrbitControls ref={controls} makeDefault enabled={!editing} enableDamping dampingFactor={.085} minDistance={radius * 2.1} maxDistance={radius * 8}
    minPolarAngle={.2} maxPolarAngle={Math.PI * .58} zoomSpeed={.8} panSpeed={.65} rotateSpeed={.65} onStart={() => { destination.current = null; onInteraction(); }} />;
}

function World(props: Props) {
  const cache = useRef(new Map<number, Voxel[]>());
  const trees = useMemo(() => props.letters.map(letter => {
    if (!cache.current.has(letter.seed)) cache.current.set(letter.seed, generateTree(letter.seed));
    return { letter, data: cache.current.get(letter.seed)! };
  }), [props.letters]);
  const height = useMemo(() => Math.max(0, ...trees.map(t => Math.max(...t.data.map(v => v.position[1] + v.size[1] / 2)))), [trees]);
  const positions = useMemo(() => props.letters.map(l => l.position), [props.letters]);
  const extent = useMemo(() => {
    const xs = [0, ...positions.map(p => p[0])], zs = [0, ...positions.map(p => p[1])];
    const center: [number, number] = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...zs) + Math.max(...zs)) / 2];
    const radius = Math.max(4.6, ...positions.map(p => Math.hypot(p[0] - center[0], p[1] - center[1]) + 4.1));
    return { center, radius };
  }, [positions]);
  useEffect(() => { props.onReady(); }, [props.onReady]);
  return <>
    <color attach="background" args={['#e9eee5']} />
    <fog attach="fog" args={['#e9eee5', 80, 190]} />
    <ambientLight intensity={.8} />
    <hemisphereLight args={['#fff4d9', '#a5b19f', 1.6]} />
    <directionalLight position={[-8, 14, 5]} intensity={2.5} color="#fff1cf" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-22} shadow-camera-right={22} shadow-camera-top={22} shadow-camera-bottom={-22} shadow-bias={-.0004} shadow-normalBias={.04} />
    <directionalLight position={[8, -6, 8]} intensity={.65} color="#dce7d7" />
    <Terrain positions={positions} />
    {trees.map(({ letter, data }) => <Tree key={letter.id} letter={letter} data={data} clock={props.clock} selected={props.selected === letter.id} onSelect={props.onSelect} />)}
    <CameraRig {...extent} height={height} recenter={props.recenter} editing={props.editing} onInteraction={props.onInteraction} />
  </>;
}

export default function Scene(props: Props) {
  return <Canvas shadows={{ type: THREE.PCFShadowMap }} dpr={[1, 1.6]} camera={{ fov: 40, near: .1, far: 200 }} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
    onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05; }}
    fallback={<div role="status">Your browser cannot open the 3D garden. Your letters are still available in “Your letters”.</div>}>
    <World {...props} />
  </Canvas>;
}
