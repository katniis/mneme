'use client';
import { useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { elementProgress, random, type Voxel } from '../lib/tree';
import { progress, type GardenState } from '../lib/garden';
import { groundHeight, type Position } from '../lib/terrain';
import { blockRemovalFrame, fallAngle, fallDirection, freezeBlocks, restAngle, type Removal, type TreeRecord } from '../lib/tree-removal';
import usePixelTexture from './usePixelTexture';

export default function Tree({ tree, data, clock, selected, onSelect, removal, survivors, plots, onRemovalComplete }: {
  tree: TreeRecord;
  data: Voxel[];
  clock: MutableRefObject<GardenState>;
  selected: boolean;
  onSelect(id: string): void;
  removal: Removal | null;
  survivors: TreeRecord[];
  plots: Position[];
  onRemovalComplete(id: string): void;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const particles = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const fall = useMemo(() => new THREE.Quaternion(), []);
  const lastProgress = useRef(-1);
  const born = useRef(performance.now());
  const completed = useRef(false);
  const texture = usePixelTexture();
  const effect = useMemo(() => {
    if (!removal) return null;
    const rng = random(tree.seed);
    const frozen = freezeBlocks(data, Math.max(0, lastProgress.current));
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
  }, [removal, data, tree, survivors, plots]);

  useLayoutEffect(() => {
    const color = new THREE.Color();
    data.forEach((v, i) => mesh.current.setColorAt(i, color.set(v.color)));
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    if (effect && particles.current) {
      dummy.scale.setScalar(0);
      dummy.updateMatrix();
      effect.blocks.forEach((block, i) => {
        particles.current.setColorAt(i, color.set(block.color));
        particles.current.setMatrixAt(i, dummy.matrix);
      });
      if (particles.current.instanceColor) particles.current.instanceColor.needsUpdate = true;
      particles.current.instanceMatrix.needsUpdate = true;
      delete document.body.dataset.treeHover;
    }
  }, [data, effect, dummy]);

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
      particles.current.instanceMatrix.needsUpdate = true;
      return;
    }
    const p = progress(tree, clock.current.time);
    const waiting = performance.now() - born.current < 1400 && p < .05;
    const value = waiting ? 0 : Math.max(.035, p);
    if (lastProgress.current === value) return;
    lastProgress.current = value;
    data.forEach((v, i) => {
      const g = elementProgress(v, value);
      dummy.position.set(...v.position.map((n, axis) => v.anchor[axis] + (n - v.anchor[axis]) * g) as [number, number, number]);
      const girth = v.kind === 'wood' && v.size[0] > .22 ? .25 + .75 * Math.min(1, value / .5) : 1;
      dummy.rotation.set(v.rotation?.[0] ?? 0, v.rotation?.[1] ?? 0, v.rotation?.[2] ?? 0);
      dummy.scale.set(v.size[0] * g * girth, v.size[1] * g, v.size[2] * g * girth);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  const choose = (e: ThreeEvent<MouseEvent>) => {
    if (!removal && e.delta <= 5) { e.stopPropagation(); onSelect(tree.id); }
  };
  return (
    <group position={[tree.position[0], groundHeight(...tree.position), tree.position[1]]}>
      <instancedMesh ref={mesh} args={[undefined, undefined, data.length]} castShadow receiveShadow frustumCulled={false}
        onClick={removal ? undefined : choose}
        onPointerOver={removal ? undefined : (e) => { e.stopPropagation(); document.body.dataset.treeHover = 'true'; }}
        onPointerOut={() => { delete document.body.dataset.treeHover; }}>
        <boxGeometry />
        <meshStandardMaterial map={texture} roughness={1} />
      </instancedMesh>
      {effect && effect.blocks.length > 0 && (
        <instancedMesh ref={particles} args={[undefined, undefined, effect.blocks.length]} frustumCulled={false} raycast={() => {}}>
          <boxGeometry />
          <meshBasicMaterial toneMapped={false} />
        </instancedMesh>
      )}
      {selected && !removal && (
        <mesh position={[0, .015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[.61, .65, 32]} />
          <meshBasicMaterial color="#d4dfb5" side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}
