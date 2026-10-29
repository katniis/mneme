import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Vec3 } from '../../lib/tree';
import { RAIN_LIMITS } from '../../lib/environment';
import { makeParticleField, rainPosition, rainSpawn, rainStreakSize, type RainSpawn, type GroundColumn } from '../../lib/atmosphere';
import { fadeNearCamera } from './particleMaterial';
import useReducedMotion from './useReducedMotion';

export default function Rain({ columns, intensity, enabled, center, radius, treeTop }: { columns: ReadonlyMap<string, GroundColumn>; intensity: number; enabled: boolean; center: [number, number]; radius: number; treeTop: number }) {
  const reduced = useReducedMotion();
  const [mobile, setMobile] = useState(true);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 700px)');
    const update = () => setMobile(query.matches); update(); query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  const limits = RAIN_LIMITS[mobile ? 'mobile' : 'desktop'];
  const drops = useRef<THREE.InstancedMesh>(null!), splashes = useRef<THREE.InstancedMesh>(null!);
  const data = useMemo(() => ({ dummy: new THREE.Object3D(), fallback: new THREE.Vector3(),
    spawns: Array<RainSpawn | null>(limits.drops).fill(null), ages: new Float64Array(limits.drops), cycles: new Uint32Array(limits.drops), hit: new Uint8Array(limits.drops),
    splashes: Array.from({ length: limits.splashes }, () => ({ x: 0, y: 0, z: 0, at: -100 })), next: 0 }), [limits]);
  const changed = useRef(0), elapsed = useRef(0), amount = useRef(intensity);
  useEffect(() => { changed.current = performance.now(); data.splashes.forEach(s => s.at = -100); }, [columns, data]);
  const moving = enabled && !reduced;
  useFrame(({ camera, controls }, delta) => {
    if (!moving || document.hidden || !drops.current || !splashes.current) return;
    const dt = Math.min(.05, delta); elapsed.current += dt;
    amount.current += (intensity - amount.current) * (1 - Math.exp(-dt * 1.2));
    const count = Math.min(limits.drops, Math.round(limits.drops * amount.current));
    drops.current.count = count;
    const target = (controls as unknown as { target?: THREE.Vector3 })?.target ?? data.fallback.set(center[0], 0, center[1]);
    const field = makeParticleField(center, radius, treeTop, { position: camera.position.toArray() as Vec3, target: target.toArray() as Vec3, aspect: (camera as THREE.PerspectiveCamera).aspect });
    for (let i = 0; i < count; i++) {
      let spawn = data.spawns[i];
      if (!spawn || rainPosition(spawn, data.ages[i]).finished) {
        const initial = !spawn;
        spawn = rainSpawn(i, data.cycles[i]++, field, columns); data.spawns[i] = spawn;
        data.ages[i] = initial ? ((i * .61803398875) % 1) * (spawn.top - (spawn.impactY ?? spawn.bottom)) / 12 : 0;
        data.hit[i] = 0;
      }
      data.ages[i] += dt;
      const s = rainPosition(spawn, data.ages[i]);
      const streak = rainStreakSize(Math.hypot(s.x - camera.position.x, s.y - camera.position.y, s.z - camera.position.z));
      data.dummy.position.set(s.x, s.y + (s.impact ? 0 : streak.length / 2), s.z);
      const visible = !s.impact && !s.finished;
      data.dummy.scale.set(visible ? streak.width : 0, visible ? streak.length : 0, visible ? streak.width : 0);
      data.dummy.updateMatrix(); drops.current.setMatrixAt(i, data.dummy.matrix);
      if (s.impact && !data.hit[i]) {
        data.hit[i] = 1;
        if (performance.now() - changed.current >= 1300) Object.assign(data.splashes[data.next++ % limits.splashes], { x: s.x, y: s.y + .015, z: s.z, at: elapsed.current });
      }
    }
    for (let i = 0; i < limits.splashes; i++) {
      const s = data.splashes[i], age = elapsed.current - s.at, visible = age < .25 && amount.current > .001;
      data.dummy.position.set(s.x, s.y, s.z); const scale = visible ? .02 + age * .5 : 0;
      data.dummy.scale.set(scale, visible ? .008 : 0, scale); data.dummy.updateMatrix(); splashes.current.setMatrixAt(i, data.dummy.matrix);
    }
    drops.current.instanceMatrix.needsUpdate = true; splashes.current.instanceMatrix.needsUpdate = true;
  });
  return moving ? <group>
    <instancedMesh ref={drops} args={[undefined, undefined, limits.drops]} raycast={() => {}} frustumCulled={false}><boxGeometry /><meshBasicMaterial color="#bdd2db" transparent opacity={.38} depthWrite={false} onBeforeCompile={fadeNearCamera} /></instancedMesh>
    <instancedMesh ref={splashes} args={[undefined, undefined, limits.splashes]} raycast={() => {}} frustumCulled={false}><boxGeometry /><meshBasicMaterial color="#d2e2e7" transparent opacity={.32} depthWrite={false} /></instancedMesh>
  </group> : null;
}
