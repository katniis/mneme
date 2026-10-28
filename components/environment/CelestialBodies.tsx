'use client';
import { Component, Suspense, useEffect, useMemo, type ReactNode } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { celestialPosition } from '../../lib/environment';

class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function haloTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d')!;
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,0.85)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.28)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function Model({ url, tint }: { url: string; tint: string }) {
  const gltf = useGLTF(url);
  const { scene, materials } = useMemo(() => {
    const clone = gltf.scene.clone(true);
    const owned: THREE.Material[] = [];
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const original = child.material as THREE.MeshStandardMaterial;
        const material = new THREE.MeshBasicMaterial({ map: original.map ?? null, color: tint });
        owned.push(material);
        child.material = material;
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    clone.position.sub(center);
    const scale = 1 / Math.max(size.x, size.y, size.z, 0.001);
    clone.scale.setScalar(scale);
    return { scene: clone, materials: owned };
  }, [gltf, tint]);
  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials]);
  return <primitive object={scene} />;
}

function Body({ url, fallbackColor, haloColor, position, diameter, haloScale, haloOpacity }: {
  url: string;
  fallbackColor: string;
  haloColor: string;
  position: [number, number, number];
  diameter: number;
  haloScale: number;
  haloOpacity: number;
}) {
  const halo = useMemo(haloTexture, []);
  useEffect(() => () => halo.dispose(), [halo]);
  const fallback = (
    <mesh>
      <sphereGeometry args={[0.5, 24, 24]} />
      <meshBasicMaterial color={fallbackColor} fog={false} />
    </mesh>
  );
  return (
    <group position={position}>
      <group scale={diameter}>
        <ModelBoundary fallback={fallback}>
          <Suspense fallback={fallback}><Model url={url} tint="#ffffff" /></Suspense>
        </ModelBoundary>
      </group>
      <sprite scale={haloScale}>
        <spriteMaterial map={halo} color={haloColor} transparent opacity={haloOpacity} depthWrite={false} fog={false} />
      </sprite>
    </group>
  );
}

export default function CelestialBodies({ solarAngle, daylight, center, radius }: {
  solarAngle: number;
  daylight: number;
  center: [number, number];
  radius: number;
}) {
  const sunPosition = celestialPosition(solarAngle, center, radius);
  const moonPosition = celestialPosition(solarAngle + Math.PI, center, radius);
  const sunDiameter = radius * 1.5;
  const moonDiameter = radius * 1.1;
  return (
    <group>
      {sunPosition[1] > -radius && (
        <Body url="/models/sun.sky.glb" fallbackColor="#ffd76a" haloColor="#ffdf8a" position={sunPosition} diameter={sunDiameter} haloScale={sunDiameter * 3.2} haloOpacity={0.25 + daylight * 0.45} />
      )}
      {moonPosition[1] > -radius && (
        <Body url="/models/moon.sky.glb" fallbackColor="#dbe6f5" haloColor="#bcd0ff" position={moonPosition} diameter={moonDiameter} haloScale={moonDiameter * 2.6} haloOpacity={0.35 * (1 - daylight)} />
      )}
    </group>
  );
}
