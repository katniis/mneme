import type * as THREE from 'three';

export function fadeNearCamera(shader: Parameters<THREE.Material['onBeforeCompile']>[0]) {
  shader.vertexShader = 'varying float vRainDistance;\n' + shader.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nvRainDistance = length(mvPosition.xyz);');
  shader.fragmentShader = 'varying float vRainDistance;\n' + shader.fragmentShader.replace('#include <opaque_fragment>', 'diffuseColor.a *= smoothstep(1.0, 3.0, vRainDistance);\n#include <opaque_fragment>');
}
