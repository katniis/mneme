'use client';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RAIN_POOLS, rainSample, type RainGround } from '../../lib/environment';
import type { TerrainVoxel } from '../../lib/terrain';

export default function Rain({ ground, intensity, enabled }: { ground: TerrainVoxel[]; intensity: number; enabled: boolean }) {
  const streaks = useRef<THREE.InstancedMesh>(null!);
  const splashes = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const mobile = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 700px)').matches, []);
  const reduced = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const pool = mobile ? RAIN_POOLS.mobile : RAIN_POOLS.desktop;
  const tops = useMemo<RainGround[]>(
    () => ground.filter((v) => v.kind === 'grass').map((v) => ({ x: v.position[0], y: v.position[1] + v.size[1] / 2, z: v.position[2] })),
    [ground],
  );
  const state = useRef({
    elapsed: 0,
    lastCycle: new Int32Array(RAIN_POOLS.desktop.drops).fill(-1),
    splashBirth: new Float32Array(RAIN_POOLS.desktop.splashes).fill(-10),
    splashPosition: new Float32Array(RAIN_POOLS.desktop.splashes * 3),
    splashSlot: 0,
    signature: '',
    suppressUntil: 0,
  });

  useLayoutEffect(() => {
    dummy.scale.setScalar(0);
    dummy.updateMatrix();
    for (let i = 0; i < pool.drops; i++) streaks.current.setMatrixAt(i, dummy.matrix);
    for (let i = 0; i < pool.splashes; i++) splashes.current.setMatrixAt(i, dummy.matrix);
    streaks.current.instanceMatrix.needsUpdate = true;
    splashes.current.instanceMatrix.needsUpdate = true;
  }, [dummy, pool]);

  useFrame((_, delta) => {
    const active = enabled && !reduced && tops.length > 0 && intensity > 0;
    streaks.current.visible = active;
    splashes.current.visible = active;
    if (!active) return;
    const s = state.current;
    if (!document.hidden) s.elapsed += Math.min(delta, 0.05);
    const signature = `${tops.length}:${tops[0].x}:${tops[0].z}:${tops[tops.length - 1].x}`;
    if (signature !== s.signature) {
      s.signature = signature;
      s.suppressUntil = s.elapsed + 1.3;
      s.splashBirth.fill(-10);
    }
    const count = Math.max(1, Math.round(pool.drops * Math.min(1, intensity)));
    for (let i = 0; i < pool.drops; i++) {
      if (i >= count) {
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        streaks.current.setMatrixAt(i, dummy.matrix);
        continue;
      }
      const sample = rainSample(i, s.elapsed, tops);
      if (!sample) continue;
      dummy.position.set(sample.x, sample.y, sample.z);
      dummy.scale.set(1, 1, 1);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      streaks.current.setMatrixAt(i, dummy.matrix);
      if (sample.impact && s.lastCycle[i] !== sample.cycle) {
        s.lastCycle[i] = sample.cycle;
        if (s.elapsed >= s.suppressUntil) {
          const slot = s.splashSlot % pool.splashes;
          s.splashSlot++;
          s.splashBirth[slot] = s.elapsed;
          s.splashPosition.set([sample.x, sample.y + 0.02, sample.z], slot * 3);
        }
      }
    }
    streaks.current.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < pool.splashes; i++) {
      const age = s.elapsed - s.splashBirth[i];
      if (age < 0 || age > 0.28) {
        dummy.scale.setScalar(0);
      } else {
        dummy.position.set(s.splashPosition[i * 3], s.splashPosition[i * 3 + 1], s.splashPosition[i * 3 + 2]);
        const scale = 0.35 + age * 3.2;
        dummy.scale.set(scale, scale, scale);
      }
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.updateMatrix();
      splashes.current.setMatrixAt(i, dummy.matrix);
    }
    splashes.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh ref={streaks} args={[undefined, undefined, pool.drops]} frustumCulled={false} raycast={() => {}}>
        <boxGeometry args={[0.025, 0.5, 0.025]} />
        <meshBasicMaterial color="#cfe4f7" transparent opacity={0.5} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={splashes} args={[undefined, undefined, pool.splashes]} frustumCulled={false} raycast={() => {}}>
        <circleGeometry args={[0.16, 12]} />
        <meshBasicMaterial color="#dceefc" transparent opacity={0.65} depthWrite={false} />
      </instancedMesh>
    </>
  );
}
