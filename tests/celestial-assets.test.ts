import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
test('optimized celestial models fit payload, geometry and texture budgets and preserve originals', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/models/celestials.json', import.meta.url), 'utf8'));
  let bytes = 0;
  for (const name of ['sun', 'moon']) {
    const source = readFileSync(new URL(`../public/models/${name}.glb`, import.meta.url));
    const glb = readFileSync(new URL(`../public/models/${name}.sky.glb`, import.meta.url));
    assert.equal(manifest[name].sourceSha256, createHash('sha256').update(source).digest('hex'));
    assert.equal(glb.toString('ascii', 0, 4), 'glTF'); assert.equal(glb.readUInt32LE(4), 2);
    const jsonLength = glb.readUInt32LE(12);
    const doc = JSON.parse(glb.toString('utf8', 20, 20 + jsonLength));
    const triangles = doc.meshes.flatMap((m: { primitives: unknown[] }) => m.primitives).reduce((sum: number, p: { indices?: number; attributes: { POSITION: number }; mode?: number }) => {
      assert.ok(p.mode === undefined || p.mode === 4);
      return sum + doc.accessors[p.indices ?? p.attributes.POSITION].count / 3;
    }, 0);
    assert.ok(triangles <= (name === 'sun' ? 20000 : 6000));
    assert.ok(!doc.buffers.some((b: { uri?: string }) => b.uri));
    assert.ok(!(doc.extensionsRequired || []).some((x: string) => /draco|meshopt|basis/i.test(x)));
    const bin = glb.subarray(28 + jsonLength);
    for (const image of doc.images || []) {
      assert.ok(!image.uri); const view = doc.bufferViews[image.bufferView];
      const imageBytes = bin.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
      assert.equal(imageBytes.toString('ascii', 0, 4), 'RIFF');
      let width = 0, height = 0;
      const type = imageBytes.toString('ascii', 12, 16);
      if (type === 'VP8X') { width = imageBytes.readUIntLE(24, 3) + 1; height = imageBytes.readUIntLE(27, 3) + 1; }
      else if (type === 'VP8 ') { width = imageBytes.readUInt16LE(26) & 0x3fff; height = imageBytes.readUInt16LE(28) & 0x3fff; }
      else if (type === 'VP8L') { const n = imageBytes.readUInt32LE(21); width = (n & 0x3fff) + 1; height = ((n >>> 14) & 0x3fff) + 1; }
      assert.ok(width > 0 && height > 0 && width <= 1024 && height <= 1024);
    }
    assert.equal(manifest[name].bytes, glb.length); bytes += glb.length;
  }
  assert.ok(bytes <= 3000000);
});
