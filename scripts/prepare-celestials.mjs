import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, renameSync, rmSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const models = join(root, 'public', 'models');
for (const name of ['sun', 'moon']) {
  if (!existsSync(join(models, `${name}.glb`))) throw new Error(`Missing public/models/${name}.glb. Restore the supplied original before preparing sky assets.`);
}
const npm = process.env.npm_execpath;
if (!npm) throw new Error('Run this script with npm run assets:celestials.');
const temporary = mkdtempSync(join(tmpdir(), 'mneme-celestials-'));
const manifest = {};
function cli(...args) {
  const result = spawnSync(process.execPath, [npm, 'exec', '--yes', '--package=@gltf-transform/cli@4.5.1', '--', 'gltf-transform', ...args], { stdio: 'inherit' });
  if (result.error || result.status !== 0) throw new Error(`Model preparation failed: ${args[0]}`);
}
try {
  for (const name of ['sun', 'moon']) {
    const source = join(models, `${name}.glb`);
    let input = source, step = 0;
    const transform = (command, ...args) => { const output = join(temporary, `${name}-${step++}.glb`); cli(command, input, output, ...args); input = output; };
    if (name === 'sun') { transform('weld'); transform('simplify', '--ratio', '.02', '--error', '.001'); }
    transform('dedup'); transform('prune');
    transform('resize', '--width', '1024', '--height', '1024');
    transform('webp', '--quality', '85');
    const bytes = readFileSync(input), jsonLength = bytes.readUInt32LE(12);
    const doc = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength));
    const triangles = (doc.meshes || []).flatMap(m => m.primitives).reduce((sum, p) => {
      if (p.mode !== undefined && p.mode !== 4) throw new Error('Unexpected primitive topology.');
      return sum + doc.accessors[p.indices ?? p.attributes.POSITION].count / 3;
    }, 0);
    if (triangles > (name === 'sun' ? 20000 : 6000)) throw new Error(`${name} exceeds its triangle budget (${triangles}). Inspect topology before changing simplification settings.`);
    if ((doc.extensionsRequired || []).some(x => /draco|meshopt|basis/i.test(x)) || doc.buffers.some(b => b.uri) || (doc.images || []).some(i => i.uri)) throw new Error('Output needs an external resource or decoder.');
    manifest[name] = { sourceSha256: createHash('sha256').update(readFileSync(source)).digest('hex'), bytes: bytes.length, triangles, largestTextureDimension: 1024 };
    writeFileSync(join(temporary, `${name}.sky.glb`), bytes);
  }
  if (manifest.sun.bytes + manifest.moon.bytes > 3000000) throw new Error('Combined sky models exceed 3 MB.');
  mkdirSync(models, { recursive: true });
  for (const name of ['sun', 'moon']) { const output = join(models, `${name}.sky.glb.tmp`); writeFileSync(output, readFileSync(join(temporary, `${name}.sky.glb`))); renameSync(output, join(models, `${name}.sky.glb`)); }
  writeFileSync(join(models, 'celestials.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify(manifest, null, 2));
} finally { rmSync(temporary, { recursive: true, force: true }); }
