import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { random } from '../lib/tree';

export default function usePixelTexture() {
  const texture = useMemo(() => {
    const rng = random(315);
    const size = 16, data = new Uint8Array(size * size * 4);
    for (let i = 0; i < size * size; i++) {
      const light = 220 + Math.floor(rng() * 35);
      data.set([light, light, light, 255], i * 4);
    }
    const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
