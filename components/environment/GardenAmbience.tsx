import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CELL } from '../../lib/terrain';
import type { GardenState } from '../../lib/garden';
import type { EnvironmentFrame } from '../../lib/environment';
import type { GroundColumn, ParticlePose } from '../../lib/atmosphere';
import { AMBIENCE_LIMITS, sampleAmbience, leafOrigin, spawnAmbient, sampleAmbientParticle, ambientSizeScale, type AmbientParticle, type LeafSource } from '../../lib/ambience';
import { fadeNearCamera } from './particleMaterial';
import useReducedMotion from './useReducedMotion';

type Props = { frame: EnvironmentFrame; columns: ReadonlyMap<string, GroundColumn>; sources: readonly LeafSource[]; clock: MutableRefObject<GardenState> };
const WINGS = new Float32Array([-.5, .4, -.2, 0, 0, .25, 0, 0, -.25, 0, 0, -.25, 0, 0, .25, .5, .4, -.2]);
function fadeParticles(shader: Parameters<THREE.Material['onBeforeCompile']>[0]) {
  fadeNearCamera(shader);
  shader.vertexShader = 'attribute float particleOpacity; varying float vParticleOpacity;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvParticleOpacity = particleOpacity;');
  shader.fragmentShader = 'varying float vParticleOpacity;\n' + shader.fragmentShader.replace('#include <opaque_fragment>', 'diffuseColor.a *= vParticleOpacity;\n#include <opaque_fragment>');
}

function AmbientPool({ frame, columns, sources, clock, group, limit }: Props & { group: keyof typeof AMBIENCE_LIMITS.desktop; limit: number }) {
  const capacity = AMBIENCE_LIMITS.desktop[group];
  const winged = group === 'butterflies' || group === 'birds';
  const mesh = useRef<THREE.InstancedMesh>(null!), grass = useMemo(() => Array.from(columns.values()), [columns]);
  const allowed = useMemo(() => new Set(sources), [sources]);
  const profile = useMemo(() => sampleAmbience(frame), [frame]);
  const data = useMemo(() => ({ particles: Array<AmbientParticle | null>(capacity).fill(null), ages: new Float64Array(capacity), cycles: new Uint32Array(capacity), opacities: new Float32Array(capacity), dummy: new THREE.Object3D(), colour: new THREE.Color(), elapsed: 0, checked: -1, amount: 0, lastCount: 0, eligible: [] as { source: LeafSource; origin: [number, number, number] }[],
    pose: { position: [0, 0, 0], rotation: [0, 0, 0], size: [0, 0, 0], opacity: 0, finished: false } as ParticlePose }), [capacity]);
  useFrame(({ camera }, delta) => {
    if (document.hidden || !mesh.current) return;
    const dt = Math.min(delta, .05); data.elapsed += dt;
    data.amount += (profile[group] - data.amount) * (1 - Math.exp(-dt * 2));
    // Small gardens use fewer details; the fixed pool ceilings stay independent of letter count.
    const count = grass.length ? Math.round(limit * data.amount * Math.min(1, Math.max(winged || group === 'fireflies' ? .35 : .15, grass.length / 2500))) : 0;
    for (let i = count; i < data.lastCount; i++) { data.particles[i] = null; data.opacities[i] = 0; }
    data.lastCount = count;
    mesh.current.count = count;
    if (group === 'debris' && data.elapsed - data.checked >= .5) {
      data.eligible.length = 0; data.checked = data.elapsed;
      for (const source of sources) { const origin = leafOrigin(source, clock.current.time, frame.season); if (origin) data.eligible.push({ source, origin }); }
    }
    for (let i = 0; i < count; i++) {
      let p = data.particles[i];
      if (p) sampleAmbientParticle(p, data.ages[i], data.pose);
      if (!p || data.pose.finished) {
        const cycle = data.cycles[i]++, seed = (i * 137 + cycle * 317 + 31) >>> 0, initial = !p;
        if (group === 'debris') {
          const candidate = data.eligible[seed % Math.max(1, data.eligible.length)];
          const origin = candidate && allowed.has(candidate.source) ? leafOrigin(candidate.source, clock.current.time, frame.season) : null;
          if (!candidate || !origin || !profile.debrisKind) { data.opacities[i] = 0; continue; }
          p = spawnAmbient(profile.debrisKind, i, cycle, origin);
          data.colour.set(frame.season === 'autumn' ? ['#b57d37', '#c0904e', '#9c6639'][seed % 3] : candidate.source.voxel.color);
        } else {
          const column = grass[seed % grass.length];
          const kind = group === 'birds' ? 'bird' : group === 'butterflies' ? 'butterfly' : group === 'fireflies' ? 'firefly' : 'mote';
          p = spawnAmbient(kind, i, cycle, [column.x, column.y + (group === 'birds' ? 2.5 : .6) + ((seed * .61803398875) % 1) * 1.5, column.z]);
          data.colour.set(group === 'birds' ? '#45504b' : group === 'butterflies' ? ['#d4b276', '#c99f9c', '#a6b99d'][seed % 3] : group === 'fireflies' ? '#d8ec91' : frame.season === 'winter' ? '#c7d3dd' : '#e6e1b3');
        }
        data.particles[i] = p; data.ages[i] = initial ? ((i * .61803398875) % 1) * p.duration : 0;
        mesh.current.setColorAt(i, data.colour);
      }
      data.ages[i] += dt; sampleAmbientParticle(p, data.ages[i], data.pose);
      if (group === 'debris') {
        const [x, y, z] = data.pose.position, column = columns.get(`${Math.round(x / CELL)}:${Math.round(z / CELL)}`);
        if (column && Math.abs(x - column.x) <= CELL / 2 && Math.abs(z - column.z) <= CELL / 2 && y <= column.y) { data.pose.opacity = 0; data.ages[i] = p.duration; }
      }
      data.dummy.position.fromArray(data.pose.position); data.dummy.rotation.set(...data.pose.rotation);
      const distanceScale = ambientSizeScale(p.kind, camera.position.distanceTo(data.dummy.position));
      data.dummy.scale.fromArray(data.pose.size).multiplyScalar(distanceScale); data.dummy.updateMatrix(); mesh.current.setMatrixAt(i, data.dummy.matrix);
      data.opacities[i] = data.pose.opacity * Math.min(1, data.amount * 3);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    mesh.current.geometry.getAttribute('particleOpacity').needsUpdate = true;
  });
  return <instancedMesh name={`ambience-${group}`} ref={mesh} args={[undefined, undefined, capacity]} raycast={() => {}} frustumCulled={false}>
    {winged ? <bufferGeometry>
      <bufferAttribute attach="attributes-position" args={[WINGS, 3]} />
      <instancedBufferAttribute attach="attributes-particleOpacity" args={[data.opacities, 1]} />
    </bufferGeometry> : <boxGeometry><instancedBufferAttribute attach="attributes-particleOpacity" args={[data.opacities, 1]} /></boxGeometry>}
    {group === 'fireflies' || winged ? <meshBasicMaterial side={THREE.DoubleSide} transparent depthWrite={false} toneMapped={false} onBeforeCompile={fadeParticles} /> : <meshStandardMaterial roughness={1} transparent depthWrite={false} onBeforeCompile={fadeParticles} />}
  </instancedMesh>;
}

export default function GardenAmbience(props: Props) {
  const reduced = useReducedMotion(), [mobile, setMobile] = useState(true);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 700px)'), update = () => setMobile(query.matches);
    update(); query.addEventListener('change', update); return () => query.removeEventListener('change', update);
  }, []);
  const limits = AMBIENCE_LIMITS[mobile ? 'mobile' : 'desktop'];
  return props.frame.enabled && props.frame.ambience && !props.frame.snow && !reduced ? <>
    <AmbientPool {...props} group="motes" limit={limits.motes} />
    <AmbientPool {...props} group="debris" limit={limits.debris} />
    <AmbientPool {...props} group="fireflies" limit={limits.fireflies} />
    <AmbientPool {...props} group="butterflies" limit={limits.butterflies} />
    <AmbientPool {...props} group="birds" limit={limits.birds} />
  </> : null;
}
