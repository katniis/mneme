import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';

type Glb = { json: any; bin: Buffer };

function readGlb(path: string): Glb {
  const buffer = readFileSync(path);
  assert.equal(buffer.toString('ascii', 0, 4), 'glTF');
  const jsonLength = buffer.readUInt32LE(12);
  const json = JSON.parse(buffer.toString('utf8', 20, 20 + jsonLength));
  const binOffset = 20 + jsonLength + 8;
  return { json, bin: buffer.subarray(binOffset) };
}

function triangles(glb: Glb): number {
  let total = 0;
  for (const mesh of glb.json.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      const accessor = primitive.indices !== undefined ? glb.json.accessors[primitive.indices] : glb.json.accessors[primitive.attributes.POSITION];
      total += Math.floor(accessor.count / 3);
    }
  }
  return total;
}

function imageDimensions(glb: Glb): { width: number; height: number }[] {
  return (glb.json.images ?? []).map((image: any) => {
    const view = glb.json.bufferViews[image.bufferView];
    const data = glb.bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
    if (data.toString('ascii', 0, 4) === 'RIFF') {
      const kind = data.toString('ascii', 8, 12);
      if (kind === 'WEBP') {
        const format = data.toString('ascii', 12, 16);
        if (format === 'VP8X') return { width: data.readUIntLE(24, 3) + 1, height: data.readUIntLE(27, 3) + 1 };
        if (format === 'VP8L') { const bits = data.readUInt32LE(21); return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }; }
        return { width: data.readUInt16LE(26) & 0x3fff, height: data.readUInt16LE(28) & 0x3fff };
      }
    }
    if (data[0] === 0x89 && data.toString('ascii', 1, 4) === 'PNG') return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
    if (data[0] === 0xff && data[1] === 0xd8) {
      let offset = 2;
      while (offset < data.length - 9) {
        if (data[offset] !== 0xff) { offset++; continue; }
        const marker = data[offset + 1];
        if (marker === 0xc0 || marker === 0xc2) return { height: data.readUInt16BE(offset + 5), width: data.readUInt16BE(offset + 7) };
        offset += 2 + data.readUInt16BE(offset + 2);
      }
    }
    throw new Error(`unsupported image format ${image.mimeType}`);
  });
}

test('optimized celestial derivatives meet budgets and preserve originals', () => {
  const manifest = JSON.parse(readFileSync('public/models/celestials.json', 'utf8'));
  let combined = 0;
  for (const [name, limit] of [['sun', 20000], ['moon', 6000]] as const) {
    const entry = manifest[name];
    assert.ok(entry, `manifest has ${name}`);
    const original = readFileSync(`public/models/${name}.glb`);
    assert.equal(entry.sourceSha256, createHash('sha256').update(original).digest('hex'), `${name} original hash recorded`);
    assert.ok(!entry.output.includes(name + '.glb') || entry.output !== `${name}.glb`);
    const glb = readGlb(`public/models/${entry.output}`);
    const tris = triangles(glb);
    assert.ok(tris <= limit, `${name} has ${tris} triangles over ${limit}`);
    assert.equal(entry.triangles, tris, `${name} manifest triangle count is measured, not reported`);
    const bytes = statSync(`public/models/${entry.output}`).size;
    assert.equal(entry.bytes, bytes);
    combined += bytes;
    const dims = imageDimensions(glb);
    assert.ok(dims.length > 0, `${name} keeps its texture`);
    for (const dim of dims) assert.ok(dim.width <= 1024 && dim.height <= 1024, `${name} texture ${dim.width}x${dim.height} exceeds 1024`);
    assert.equal(entry.maxTextureDimension, Math.max(...dims.flatMap((d) => [d.width, d.height])));
    for (const buffer of glb.json.buffers ?? []) assert.ok(!buffer.uri || buffer.uri.startsWith('data:'), `${name} has no external buffer`);
    for (const image of glb.json.images ?? []) assert.ok(!image.uri || image.uri.startsWith('data:'), `${name} has no external image`);
    const required = glb.json.extensionsRequired ?? [];
    for (const banned of ['KHR_draco_mesh_compression', 'EXT_meshopt_compression', 'KHR_texture_basisu']) assert.ok(!required.includes(banned), `${name} must not require ${banned}`);
  }
  assert.ok(combined <= 3000000, `combined derivatives ${combined} bytes exceed 3000000`);
});
