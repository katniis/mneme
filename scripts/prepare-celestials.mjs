// Offline preparation of lightweight celestial derivatives.
// Uses the pinned glTF Transform CLI 4.5.1 as a one-off tool (npx), never as
// an app runtime dependency. Originals in public/models stay byte-identical.
import { exec } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(exec);
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const models = path.join(root, 'public', 'models');
const work = path.join(models, '.prepare-tmp');
const CLI = ['--cache', path.join(root, '.npm-cache'), '-y', '@gltf-transform/cli@4.5.1'];
const BUDGETS = { sun: { triangles: 20000 }, moon: { triangles: 6000 } };
const COMBINED_BYTES = 3000000;
const MAX_TEXTURE = 1024;

async function cli(...args) {
  // All arguments are static strings or workspace paths built in this script.
  const quoted = [...CLI, ...args].map((arg) => `"${arg}"`).join(' ');
  const env = { ...process.env, npm_config_cache: process.env.npm_config_cache || path.join(root, '.npm-cache') };
  await run(`npx ${quoted}`, { cwd: root, env, maxBuffer: 32 * 1024 * 1024 });
}

function readGlb(file) {
  const buffer = readFileSync(file);
  const jsonLength = buffer.readUInt32LE(12);
  const json = JSON.parse(buffer.toString('utf8', 20, 20 + jsonLength));
  return { buffer, json, bin: buffer.subarray(20 + jsonLength + 8) };
}

function triangles(glb) {
  let total = 0;
  for (const mesh of glb.json.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      const accessor = primitive.indices !== undefined ? glb.json.accessors[primitive.indices] : glb.json.accessors[primitive.attributes.POSITION];
      total += Math.floor(accessor.count / 3);
    }
  }
  return total;
}

function imageDimensions(glb) {
  return (glb.json.images ?? []).map((image) => {
    const view = glb.json.bufferViews[image.bufferView];
    const data = glb.bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
    if (data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 12, 16) === 'VP8X') {
      return Math.max(data.readUIntLE(24, 3) + 1, data.readUIntLE(27, 3) + 1);
    }
    if (data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 12, 16) === 'VP8L') {
      const bits = data.readUInt32LE(21);
      return Math.max((bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1);
    }
    if (data.toString('ascii', 0, 4) === 'RIFF') return Math.max(data.readUInt16LE(26) & 0x3fff, data.readUInt16LE(28) & 0x3fff);
    if (data[0] === 0x89) return Math.max(data.readUInt32BE(16), data.readUInt32BE(20));
    let offset = 2;
    while (offset < data.length - 9) {
      if (data[offset] !== 0xff) { offset++; continue; }
      if (data[offset + 1] === 0xc0 || data[offset + 1] === 0xc2) return Math.max(data.readUInt16BE(offset + 5), data.readUInt16BE(offset + 7));
      offset += 2 + data.readUInt16BE(offset + 2);
    }
    throw new Error(`Unsupported image format ${image.mimeType}`);
  });
}

const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

async function prepare(name, simplifySun) {
  const source = path.join(models, `${name}.glb`);
  const steps = [];
  let input = source;
  const step = async (label, command, flags = []) => {
    const output = path.join(work, `${name}-${label}.glb`);
    await cli(command, input, output, ...flags);
    steps.push(output);
    input = output;
  };
  if (simplifySun) await step('simplified', 'simplify', ['--ratio', '0.02', '--error', '0.001']);
  await step('resized', 'resize', ['--width', String(MAX_TEXTURE), '--height', String(MAX_TEXTURE)]);
  await step('webp', 'webp', ['--quality', '85']);
  await step('pruned', 'prune');
  await step('deduped', 'dedup');
  const glb = readGlb(input);
  const tris = triangles(glb);
  const dims = imageDimensions(glb);
  const bytes = statSync(input).size;
  if (tris > BUDGETS[name].triangles) throw new Error(`${name}: ${tris} triangles exceeds budget ${BUDGETS[name].triangles}`);
  if (dims.some((d) => d > MAX_TEXTURE)) throw new Error(`${name}: texture exceeds ${MAX_TEXTURE}px`);
  const output = `${name}.sky.glb`;
  renameSync(input, path.join(models, output));
  return { source: `${name}.glb`, sourceSha256: sha256(source), output, bytes, triangles: tris, maxTextureDimension: Math.max(...dims) };
}

mkdirSync(work, { recursive: true });
try {
  const before = { sun: sha256(path.join(models, 'sun.glb')), moon: sha256(path.join(models, 'moon.glb')) };
  const manifest = { sun: await prepare('sun', true), moon: await prepare('moon', false) };
  const combined = manifest.sun.bytes + manifest.moon.bytes;
  if (combined > COMBINED_BYTES) throw new Error(`Combined derivatives ${combined} bytes exceed ${COMBINED_BYTES}`);
  if (sha256(path.join(models, 'sun.glb')) !== before.sun || sha256(path.join(models, 'moon.glb')) !== before.moon) {
    throw new Error('Original celestial models changed during preparation');
  }
  writeFileSync(path.join(models, 'celestials.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`sun: ${manifest.sun.triangles} triangles, ${manifest.sun.bytes} bytes`);
  console.log(`moon: ${manifest.moon.triangles} triangles, ${manifest.moon.bytes} bytes`);
  console.log(`combined: ${combined} bytes`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
