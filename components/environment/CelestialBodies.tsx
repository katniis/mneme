import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

class ModelBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
function Model({ name }: { name: 'sun' | 'moon' }) {
  const { scene } = useGLTF(`/models/${name}.sky.glb`);
  const { object, materials } = useMemo(() => {
    const object = scene.clone(true);
    const materials: THREE.Material[] = [];
    object.traverse(child => {
      if (!(child instanceof THREE.Mesh)) return;
      child.raycast = () => {};
      const convert = (old: THREE.MeshStandardMaterial) => {
        const material = new THREE.MeshBasicMaterial({ map: old.map, color: old.color, side: old.side, toneMapped: false, fog: false });
        materials.push(material); return material;
      };
      child.material = Array.isArray(child.material) ? child.material.map(convert) : convert(child.material);
    });
    const bounds = new THREE.Box3().setFromObject(object), size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
    const scale = 2 / Math.max(size.x, size.y, size.z, .001);
    object.scale.multiplyScalar(scale); object.position.copy(center).multiplyScalar(-scale);
    return { object, materials };
  }, [scene]);
  useEffect(() => () => materials.forEach(m => m.dispose()), [materials]);
  return <primitive object={object} dispose={null} />;
}
function Body({ name }: { name: 'sun' | 'moon' }) {
  const fallback = <mesh raycast={() => {}}><sphereGeometry args={[1, 24, 16]} /><meshBasicMaterial color={name === 'sun' ? '#ffdc8c' : '#e2e6df'} toneMapped={false} fog={false} /></mesh>;
  return <ModelBoundary fallback={fallback}><Suspense fallback={fallback}><Model name={name} /></Suspense></ModelBoundary>;
}
function Halo({ moon = false }: { moon?: boolean }) {
  const texture = useMemo(() => {
    const size = 64, data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = 255;
      data[i + 3] = Math.round(Math.pow(Math.max(0, 1 - Math.hypot(x - 31.5, y - 31.5) / 32), 2) * 255);
    }
    const texture = new THREE.DataTexture(data, size, size); texture.needsUpdate = true; return texture;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return <sprite scale={moon ? [3.5, 3.5, 1] : [5, 5, 1]} raycast={() => {}}><spriteMaterial map={texture} color={moon ? '#dce8ff' : '#ffc577'} transparent opacity={moon ? .18 : .4} depthWrite={false} toneMapped={false} fog={false} /></sprite>;
}
export default function CelestialBodies({ solarAngle, radius, reduced }: { solarAngle: number; daylight: number; radius: number; reduced: boolean }) {
  const group = useRef<THREE.Group>(null!);
  const sun = useRef<THREE.Group>(null!), moon = useRef<THREE.Group>(null!);
  const angle = useRef(solarAngle);
  useFrame(({ camera }, delta) => {
    if (document.hidden) return;
    let difference = solarAngle - angle.current;
    if (difference > Math.PI) difference -= Math.PI * 2;
    if (difference < -Math.PI) difference += Math.PI * 2;
    angle.current += difference * (reduced ? 1 : 1 - Math.exp(-Math.min(delta, .1) * 2));
    group.current.position.copy(camera.position); group.current.quaternion.copy(camera.quaternion);
    const distance = radius * 10;
    const mobile = camera instanceof THREE.PerspectiveCamera && camera.aspect < 1;
    for (const [body, offset] of [[sun.current, 0], [moon.current, Math.PI]] as const) {
      const a = angle.current + offset;
      body.position.set(distance * (mobile ? Math.cos(a) * .08 + .09 : Math.cos(a) * .42), distance * (mobile ? Math.sin(a) * .075 + .055 : Math.sin(a) * .22 + .06), -distance);
      body.scale.setScalar(distance * (mobile ? .018 : body === sun.current ? .033 : .027));
      body.visible = Math.sin(a) > -.12;
    }
  });
  return <group ref={group}>
    <group ref={sun}><Body name="sun" /><Halo /></group>
    <group ref={moon}><Body name="moon" /><Halo moon /></group>
  </group>;
}
