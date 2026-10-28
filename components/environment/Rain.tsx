import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { TerrainVoxel } from '../../lib/terrain';
import { RAIN_LIMITS, rainSample } from '../../lib/environment';
import useReducedMotion from './useReducedMotion';

export default function Rain({ ground, intensity, enabled }: { ground: TerrainVoxel[]; intensity: number; enabled: boolean }) {
  const reduced = useReducedMotion();
  const [mobile, setMobile] = useState(true);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 700px)');
    const update = () => setMobile(query.matches); update(); query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  const limits = RAIN_LIMITS[mobile ? 'mobile' : 'desktop'];
  const drops = useRef<THREE.InstancedMesh>(null!), splashes = useRef<THREE.InstancedMesh>(null!);
  const columns = useMemo(() => ground.filter(v => v.kind === 'grass').map(v => ({ x: v.position[0], y: v.position[1] + v.size[1] / 2, z: v.position[2] })), [ground]);
  const data = useMemo(() => ({ dummy: new THREE.Object3D(), cycles: new Float64Array(limits.drops).fill(-1), splashes: Array.from({ length: limits.splashes }, () => ({ x: 0, y: 0, z: 0, at: -100 })), next: 0 }), [limits]);
  const changed = useRef(0), elapsed = useRef(0), amount = useRef(intensity), first = useRef(true);
  useEffect(() => { changed.current = performance.now(); data.cycles.fill(-1); data.splashes.forEach(s => s.at = -100); }, [columns, data]);
  const moving = enabled && !reduced;
  useFrame((_, delta) => {
    if (!moving || document.hidden || !drops.current || !splashes.current) return;
    const dt = Math.min(.05, delta); elapsed.current += dt;
    amount.current += (intensity - amount.current) * (1 - Math.exp(-dt * 1.2));
    if (first.current) { amount.current = intensity; first.current = false; }
    const count = Math.min(limits.drops, Math.round(limits.drops * amount.current));
    drops.current.count = count;
    for (let i = 0; i < count; i++) {
      const s = rainSample(i, elapsed.current, columns);
      if (!s) { drops.current.count = 0; break; }
      data.dummy.position.set(s.x, s.y + (s.impact ? 0 : .16), s.z);
      data.dummy.scale.set(s.impact ? 0 : .014, s.impact ? 0 : .32, s.impact ? 0 : .014);
      data.dummy.updateMatrix(); drops.current.setMatrixAt(i, data.dummy.matrix);
      if (s.impact && data.cycles[i] !== s.cycle) {
        data.cycles[i] = s.cycle;
        if (performance.now() - changed.current >= 1300) { Object.assign(data.splashes[data.next++ % limits.splashes], { x: s.x, y: s.y + .015, z: s.z, at: elapsed.current }); }
      }
    }
    for (let i = 0; i < limits.splashes; i++) {
      const s = data.splashes[i], age = elapsed.current - s.at, visible = age < .25 && amount.current > .001;
      data.dummy.position.set(s.x, s.y, s.z); const scale = visible ? .02 + age * .5 : 0;
      data.dummy.scale.set(scale, .008 * (visible ? 1 : 0), scale); data.dummy.updateMatrix(); splashes.current.setMatrixAt(i, data.dummy.matrix);
    }
    drops.current.instanceMatrix.needsUpdate = true; splashes.current.instanceMatrix.needsUpdate = true;
  });
  return moving ? <group>
    <instancedMesh ref={drops} args={[undefined, undefined, limits.drops]} raycast={() => {}} frustumCulled={false}><boxGeometry /><meshBasicMaterial color="#bdd2db" transparent opacity={.38} depthWrite={false} /></instancedMesh>
    <instancedMesh ref={splashes} args={[undefined, undefined, limits.splashes]} raycast={() => {}} frustumCulled={false}><boxGeometry /><meshBasicMaterial color="#d2e2e7" transparent opacity={.32} depthWrite={false} /></instancedMesh>
  </group> : null;
}
