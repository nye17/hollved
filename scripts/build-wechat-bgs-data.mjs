import fs from 'node:fs/promises';
import path from 'node:path';

const SOURCE_BASE = process.env.BGS_SOURCE_BASE ||
  'https://hsimonfroy.github.io/hollved-data/desi/bgs/';
const SAMPLE_DIVISOR = Number(process.env.BGS_MOBILE_SAMPLE_DIVISOR || 8);
const RECORD_BYTES = 6; // three little-endian float16 coordinates
const OUT_DIR = path.resolve('build-wechat-bgs/data/desi/bgs');

if (!Number.isInteger(SAMPLE_DIVISOR) || SAMPLE_DIVISOR < 1) {
  throw new Error('BGS_MOBILE_SAMPLE_DIVISOR must be a positive integer');
}

function hash32(x) {
  x = ((x >>> 0) ^ 61) ^ ((x >>> 0) >>> 16);
  x = Math.imul(x, 9);
  x = x ^ (x >>> 4);
  x = Math.imul(x, 0x27d4eb2d);
  x = x ^ (x >>> 15);
  return x >>> 0;
}

function keepRecord(i) {
  return (hash32(i) % SAMPLE_DIVISOR) === 0;
}

async function fetchRequired(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
  }
  return res;
}

console.log(`Fetching DESI BGS source catalogue from ${SOURCE_BASE}`);

const [metaRes, positionsRes] = await Promise.all([
  fetchRequired(new URL('meta.json', SOURCE_BASE)),
  fetchRequired(new URL('positions.bin', SOURCE_BASE))
]);

const sourceMeta = await metaRes.json();
const source = Buffer.from(await positionsRes.arrayBuffer());

if (source.length % RECORD_BYTES !== 0) {
  throw new Error(
    `positions.bin has ${source.length} bytes; expected a multiple of ${RECORD_BYTES}`
  );
}

const sourceCount = source.length / RECORD_BYTES;
if (sourceMeta.count && Number(sourceMeta.count) !== sourceCount) {
  throw new Error(
    `meta.json count (${sourceMeta.count}) does not match positions.bin (${sourceCount})`
  );
}

let selectedCount = 0;
for (let i = 0; i < sourceCount; i += 1) {
  if (keepRecord(i)) selectedCount += 1;
}

const sampled = Buffer.allocUnsafe(selectedCount * RECORD_BYTES);
let outOffset = 0;

for (let i = 0; i < sourceCount; i += 1) {
  if (!keepRecord(i)) continue;
  const inOffset = i * RECORD_BYTES;
  source.copy(sampled, outOffset, inOffset, inOffset + RECORD_BYTES);
  outOffset += RECORD_BYTES;
}

await fs.mkdir(OUT_DIR, { recursive: true });
await fs.writeFile(path.join(OUT_DIR, 'positions.bin'), sampled);

const mobileMeta = {
  ...sourceMeta,
  count: selectedCount
};
await fs.writeFile(
  path.join(OUT_DIR, 'meta.json'),
  JSON.stringify(mobileMeta) + '\n'
);

const manifest = { tracers: ['bgs'] };
await fs.mkdir(path.resolve('build-wechat-bgs/data/desi'), { recursive: true });
await fs.writeFile(
  path.resolve('build-wechat-bgs/data/desi/manifest.json'),
  JSON.stringify(manifest) + '\n'
);

const provenance = {
  source: SOURCE_BASE,
  sourceCount,
  sampleDivisor: SAMPLE_DIVISOR,
  selectedCount,
  recordBytes: RECORD_BYTES,
  generatedAt: new Date().toISOString()
};
await fs.writeFile(
  path.resolve('build-wechat-bgs/data/desi/bgs/sample.json'),
  JSON.stringify(provenance, null, 2) + '\n'
);

console.log(
  `Mobile BGS catalogue: ${selectedCount.toLocaleString()} / ` +
  `${sourceCount.toLocaleString()} galaxies, ` +
  `${(sampled.length / 1024 / 1024).toFixed(2)} MiB`
);
