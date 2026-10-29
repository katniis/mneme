import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { makeParticleField, type GroundColumn, type ParticlePose } from '../../lib/atmosphere';
import { SNOW_LIMITS, spawnSnow, sampleSnow, snowSize, type SnowParticle } from '../../lib/snow';
import type { Vec3 } from '../../lib/tree';
import { fadeNearCamera } from './particleMaterial';
import useReducedMotion from './useReducedMotion';

export default function Snow({ columns, enabled, center, radius, treeTop }: { columns: ReadonlyMap<string, GroundColumn>; enabled: boolean; center: [number, number]; radius: number; treeTop: number }) {
  const reduced = useReducedMotion(), [mobile, setMobile] = useState(true);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 700px)'), update = () => setMobile(query.matches);
    update(); query.addEventListener('change', update); return () => query.removeEventListener('change', update);
  }, []);
  const limit = SNOW_LIMITS[mobile ? 'mobile' : 'desktop'], mesh = useRef<THREE.InstancedMesh>(null!);
  // Keep the backing buffer stable through breakpoint changes; only the active draw/update count changes.
  const data = useMemo(() => ({ particles: Array<SnowParticle | null>(SNOW_LIMITS.desktop).fill(null), ages: new Float64Array(SNOW_LIMITS.desktop), cycles: new Uint32Array(SNOW_LIMITS.desktop), dummy: new THREE.Object3D(), fallback: new THREE.Vector3(),
    pose: { position: [0, 0, 0], rotation: [0, 0, 0], size: [0, 0, 0], opacity: 0, finished: false } as ParticlePose }), []);
  const moving = enabled && !reduced;
  useEffect(() => { if (!moving) data.particles.fill(null); }, [moving, data]);
  useEffect(() => { data.particles.fill(null, limit); }, [limit, data]);
  useFrame(({ camera, controls }, delta) => {
    if (!moving || document.hidden || !mesh.current) return;
    mesh.current.count = limit;
    const target = (controls as unknown as { target?: THREE.Vector3 })?.target ?? data.fallback.set(center[0], 0, center[1]);
    const field = makeParticleField(center, radius, treeTop, { position: camera.position.toArray() as Vec3, target: target.toArray() as Vec3, aspect: (camera as THREE.PerspectiveCamera).aspect });
    for (let i = 0; i < limit; i++) {
      let p = data.particles[i];
      if (p) sampleSnow(p, data.ages[i], columns, data.pose);
      if (!p || data.pose.finished) {
        const initial = !p;
        p = spawnSnow(i, data.cycles[i]++, field); data.particles[i] = p;
        data.ages[i] = initial ? ((i * .61803398875) % 1) * (field.top - field.bottom) / p.speed : 0;
      }
      data.ages[i] += Math.min(delta, .05);
      sampleSnow(p, data.ages[i], columns, data.pose);
      data.dummy.position.fromArray(data.pose.position); data.dummy.rotation.set(...data.pose.rotation);
      const size = data.pose.finished ? 0 : snowSize(p.size, camera.position.distanceTo(data.dummy.position));
      data.dummy.scale.set(size, size * .65, size); data.dummy.updateMatrix(); mesh.current.setMatrixAt(i, data.dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return moving ? <instancedMesh ref={mesh} args={[undefined, undefined, SNOW_LIMITS.desktop]} raycast={() => {}} frustumCulled={false}>
    <boxGeometry /><meshStandardMaterial color="#e4ebee" roughness={1} transparent opacity={.8} depthWrite={false} onBeforeCompile={fadeNearCamera} />
  </instancedMesh> : null;
}
