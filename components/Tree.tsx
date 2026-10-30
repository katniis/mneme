'use client';
import { useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { elementProgress, random, treeFamily, type Voxel } from '../lib/tree';
import { progress, type GardenState } from '../lib/garden';
import { groundHeight, type Position } from '../lib/terrain';
import { blockRemovalFrame, fallAngle, fallDirection, freezeBlocks, restAngle, type Removal, type TreeRecord } from '../lib/tree-removal';
import usePixelTexture from './usePixelTexture';
import type { EnvironmentFrame } from '../lib/environment';
import { sampleTreeAppearance } from '../lib/trees/phenology';
import type { VoxelAppearance } from '../lib/trees/types';

function treeEmission(shader: Parameters<THREE.MeshStandardMaterial['onBeforeCompile']>[0]) {
  shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute float treeEmission;\nvarying float vTreeEmission;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTreeEmission = treeEmission;');
  shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vTreeEmission;')
    .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * vTreeEmission;');
}
const SPOT_VERTEX = `varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SPOT_FRAGMENT = `uniform vec3 uColor; varying vec2 vUv;
void main() { float d = length(vUv - 0.5) * 2.0; float a = smoothstep(1.0, 0.15, d) * 0.38; gl_FragColor = vec4(uColor, a); }`;


export default function Tree({ tree, data, clock, selected, onSelect, removal, survivors, plots, onRemovalComplete, environment }: {
  tree: TreeRecord;
  data: Voxel[];
  clock: MutableRefObject<GardenState>;
  selected: boolean;
  onSelect(id: string): void;
  removal: Removal | null;
  survivors: TreeRecord[];
  plots: Position[];
  onRemovalComplete(id: string): void;
  environment: Pick<EnvironmentFrame, 'season' | 'daylight'>;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const particles = useRef<THREE.InstancedMesh>(null!);
  const spot = useRef<THREE.Mesh>(null!);
  const ring = useRef<THREE.Mesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const fall = useMemo(() => new THREE.Quaternion(), []);
  const lastProgress = useRef(-1);
  const born = useRef(performance.now());
  const completed = useRef(false);
  const texture = usePixelTexture();
  const emission = useMemo(() => new THREE.InstancedBufferAttribute(new Float32Array(data.length), 1), [data]);
  const displayed = useMemo<VoxelAppearance[]>(() => data.map(v => ({ scale: 0, color: v.color, emissive: 0 })), [data]);
  const appearanceKey = useRef('');
  const color = useMemo(() => new THREE.Color(), []);
  const spotUniforms = useMemo(() => ({ uColor: { value: new THREE.Color('#ffedb8') } }), []);
  const baseY = groundHeight(...tree.position);
  const SEG = 64;
  const ringGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((SEG + 1) * 2 * 3), 3));
    const idx: number[] = [];
    for (let i = 0; i < SEG; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, b, c, b, d, c); }
    geo.setIndex(idx);
    return geo;
  }, []);
  const discGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const count = 1 + 3 * SEG;
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
    const idx: number[] = [];
    for (let i = 0; i < SEG; i++) { const n = (i + 1) % SEG; idx.push(0, 1 + n, 1 + i); }
    for (let j = 0; j < 2; j++) for (let i = 0; i < SEG; i++) { const n = (i + 1) % SEG, a = 1 + j * SEG + i, b = 1 + j * SEG + n, c = 1 + (j + 1) * SEG + i, d = 1 + (j + 1) * SEG + n; idx.push(a, b, c, b, d, c); }
    geo.setIndex(idx);
    return geo;
  }, []);
  const fitGround = (ringR: number, discR: number) => {
    const rp = ringGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i <= SEG; i++) {
      const a = (i / SEG) * Math.PI * 2, cos = Math.cos(a), sin = Math.sin(a);
      for (let k = 0; k < 2; k++) {
        const r = k === 0 ? ringR * .965 : ringR, lx = cos * r, lz = sin * r, vi = (i * 2 + k) * 3;
        rp.array[vi] = lx; rp.array[vi + 1] = groundHeight(tree.position[0] + lx, tree.position[1] + lz) - baseY + .04; rp.array[vi + 2] = lz;
      }
    }
    rp.needsUpdate = true;
    const dp = discGeo.attributes.position as THREE.BufferAttribute, du = discGeo.attributes.uv as THREE.BufferAttribute;
    dp.array[1] = .03; du.array[0] = .5; du.array[1] = .5;
    [0.35, 0.65, 1].forEach((frac, j) => {
      for (let i = 0; i < SEG; i++) {
        const a = (i / SEG) * Math.PI * 2, lx = Math.cos(a) * discR * frac, lz = Math.sin(a) * discR * frac, vi = 1 + j * SEG + i;
        dp.array[vi * 3] = lx; dp.array[vi * 3 + 1] = groundHeight(tree.position[0] + lx, tree.position[1] + lz) - baseY + .03; dp.array[vi * 3 + 2] = lz;
        du.array[vi * 2] = .5 + lx / (2 * discR); du.array[vi * 2 + 1] = .5 + lz / (2 * discR);
      }
    });
    dp.needsUpdate = true; du.needsUpdate = true;
  };
    const crownRad = useMemo(() => { const leaves = data.filter(v => v.kind === 'leaf'); const src = leaves.length ? leaves : data; return Math.max(.5, ...src.map(v => Math.hypot(v.position[0], v.position[2]))); }, [data]);
  const effect = useMemo(() => {
    if (!removal) return null;
    const rng = random(tree.seed);
    const frozen = freezeBlocks(data, Math.max(0, lastProgress.current), displayed);
    const direction = fallDirection(tree, survivors, plots);
    const axis = new THREE.Vector3(Math.cos(direction), 0, -Math.sin(direction));
    const contact = restAngle(frozen, tree.position, direction, groundHeight);
    const landed = new THREE.Quaternion().setFromAxisAngle(axis, contact);
    const blocks = frozen.map(block => ({
      ...block,
      order: block.position[1] + rng() * .4,
      local: new THREE.Vector3(...block.position),
      landed: new THREE.Vector3(...block.position).applyQuaternion(landed),
      quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(...block.rotation)),
      rise: .9 + rng() * .7,
      driftX: (rng() - .5) * .4,
      driftZ: (rng() - .5) * .4,
      particleSize: Math.min(.14, Math.max(...block.size) * .35),
    })).sort((a, b) => a.order - b.order);
    return { axis, contact, blocks };
  }, [removal, data, tree, survivors, plots, displayed]);

  useLayoutEffect(() => {
    const color = new THREE.Color();
    if (!effect) {
      dummy.scale.setScalar(0); dummy.updateMatrix();
    data.forEach((v, i) => { mesh.current.setColorAt(i, color.set(v.color)); mesh.current.setMatrixAt(i, dummy.matrix); });
      mesh.current.instanceMatrix.needsUpdate = true;
      mesh.current.boundingSphere = null;
    }
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    if (effect && particles.current) {
      dummy.scale.setScalar(0);
      dummy.updateMatrix();
      effect.blocks.forEach((block, i) => {
        mesh.current.setColorAt(block.sourceIndex, color.set(block.color));
        emission.setX(block.sourceIndex, block.emissive ?? 0);
        particles.current.setColorAt(i, color.set(block.color));
        particles.current.setMatrixAt(i, dummy.matrix);
      });
      if (particles.current.instanceColor) particles.current.instanceColor.needsUpdate = true;
      particles.current.instanceMatrix.needsUpdate = true;
      delete document.body.dataset.treeHover;
    }
    emission.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  }, [data, effect, dummy, emission]);

  useFrame(() => {
    if (removal && effect) {
      const elapsed = performance.now() - removal.startedAt;
      if (!effect.blocks.length || elapsed >= 3800) {
        if (!completed.current) { completed.current = true; onRemovalComplete(tree.id); }
        return;
      }
      fall.setFromAxisAngle(effect.axis, fallAngle(elapsed, effect.contact));
      effect.blocks.forEach((block, rank) => {
        const frame = blockRemovalFrame(elapsed, rank, effect.blocks.length);
        dummy.position.copy(block.local).applyQuaternion(fall);
        dummy.quaternion.copy(fall).multiply(block.quaternion);
        dummy.scale.set(block.size[0] * frame.blockScale, block.size[1] * frame.blockScale, block.size[2] * frame.blockScale);
        dummy.updateMatrix();
        mesh.current.setMatrixAt(block.sourceIndex, dummy.matrix);
        const age = frame.particleAge === null ? 0 : Math.min(1, frame.particleAge / 800);
        dummy.position.copy(block.landed);
        dummy.position.x += block.driftX * age;
        dummy.position.y += block.rise * (1 - (1 - age) ** 2);
        dummy.position.z += block.driftZ * age;
        dummy.rotation.set(age, age * 2, age);
        dummy.scale.setScalar(block.particleSize * frame.particleScale);
        dummy.updateMatrix();
        particles.current.setMatrixAt(rank, dummy.matrix);
      });
      mesh.current.instanceMatrix.needsUpdate = true;
      mesh.current.boundingSphere = null;
      particles.current.instanceMatrix.needsUpdate = true;
      return;
    }
    const p = progress(tree, clock.current.time);
    const waiting = performance.now() - born.current < 1400 && p < .05;
    const value = waiting ? 0 : Math.max(.035, p);
    const key = `${environment.season}:${environment.daylight}`;
    if (lastProgress.current === value && appearanceKey.current === key) return;
    lastProgress.current = value;
    appearanceKey.current = key;
    const species = treeFamily(tree.seed, tree.species);
    data.forEach((v, i) => {
      const a = sampleTreeAppearance(v, species, environment.season, value);
      a.emissive *= .25 + .75 * (1 - environment.daylight);
      displayed[i] = a;
      mesh.current.setColorAt(i, color.set(a.color)); emission.setX(i, a.emissive);
      const g = elementProgress(v, value) * a.scale;
      dummy.position.set(...v.position.map((n, axis) => v.anchor[axis] + (n - v.anchor[axis]) * g) as [number, number, number]);
      const girth = v.kind === 'wood' && v.size[0] > .22 ? .25 + .75 * Math.min(1, value / .5) : 1;
      dummy.rotation.set(v.rotation?.[0] ?? 0, v.rotation?.[1] ?? 0, v.rotation?.[2] ?? 0);
      dummy.scale.set(v.size[0] * g * girth, v.size[1] * g, v.size[2] * g * girth);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (selected) fitGround((.65 + crownRad * value) * .88, (.7 + crownRad * value) * .88);
    mesh.current.boundingSphere = null;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    emission.needsUpdate = true;
  });

  useEffect(() => { lastProgress.current = -1; }, [selected]);
  useLayoutEffect(() => { if (selected) { const p = Math.max(.035, progress(tree, clock.current.time)); fitGround((.65 + crownRad * p) * .88, (.7 + crownRad * p) * .88); } }, [selected, crownRad, tree, clock]);
  const choose = (e: ThreeEvent<MouseEvent>) => {
    if (!removal && e.delta <= 5) { e.stopPropagation(); onSelect(tree.id); }
  };
  return (
    <group position={[tree.position[0], baseY, tree.position[1]]}>
      <instancedMesh name={`tree:${tree.id}`} ref={mesh} args={[undefined, undefined, data.length]} castShadow receiveShadow frustumCulled={false}
        raycast={function (this: THREE.InstancedMesh, raycaster, hits) {
          const candidates: THREE.Intersection[] = [];
          THREE.InstancedMesh.prototype.raycast.call(this, raycaster, candidates);
          hits.push(...candidates.filter(hit => displayed[hit.instanceId ?? -1]?.scale > 0));
        }}
        onClick={removal ? undefined : choose}
        onPointerOver={removal ? undefined : (e) => { e.stopPropagation(); document.body.dataset.treeHover = 'true'; }}
        onPointerOut={() => { delete document.body.dataset.treeHover; }}>
        <boxGeometry><primitive object={emission} attach="attributes-treeEmission" /></boxGeometry>
        <meshStandardMaterial map={texture} roughness={1} onBeforeCompile={treeEmission} />
      </instancedMesh>
      {effect && effect.blocks.length > 0 && (
        <instancedMesh ref={particles} args={[undefined, undefined, effect.blocks.length]} frustumCulled={false} raycast={() => {}}>
          <boxGeometry />
          <meshBasicMaterial toneMapped={false} />
        </instancedMesh>
      )}
      {selected && !removal && (
        <>
          <mesh ref={spot} geometry={discGeo} frustumCulled={false} renderOrder={9} raycast={() => {}}>
            <shaderMaterial uniforms={spotUniforms} vertexShader={SPOT_VERTEX} fragmentShader={SPOT_FRAGMENT} transparent depthWrite={false} />
          </mesh>
          <mesh ref={ring} geometry={ringGeo} frustumCulled={false} raycast={() => {}}>
          <meshBasicMaterial color="#d4dfb5" side={THREE.DoubleSide} />
        </mesh>
        </>
      )}
    </group>
  );
}
