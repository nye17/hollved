import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SOURCE_BASE = 'https://hsimonfroy.github.io/hollved-data/desi/bgs/';
const OUT_ROOT = path.resolve('build-wechat-bgs/data/desi');
const OUT_BGS = path.join(OUT_ROOT, 'bgs');
const RECORD_BYTES = 6; // 3 little-endian float16 coordinates
const SAMPLE_MASK = 0x7; // keep ~1/8 of records
const CHUNK_RECORDS = 32768; // ~192 KiB per request

function hash32(x) {
  x = (x ^ (x >>> 16)) >>> 0;
  x = Math.imul(x, 0x7feb352d) >>> 0;
  x = (x ^ (x >>> 15)) >>> 0;
  x = Math.imul(x, 0x846ca68b) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  return x >>> 0;
}

function keepRecord(index) {
  return (hash32(index) & SAMPLE_MASK) === 0;
}

async function fetchRequired(url, type) {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error('Failed to fetch ' + url + ': HTTP ' + response.status);
  }
  return type === 'json' ? response.json() : response.arrayBuffer();
}

function chunkName(index) {
  return 'positions-' + String(index).padStart(3, '0') + '.bin';
}

async function main() {
  console.log('Fetching upstream DESI BGS metadata and positions...');
  const [meta, arrayBuffer] = await Promise.all([
    fetchRequired(SOURCE_BASE + 'meta.json', 'json'),
    fetchRequired(SOURCE_BASE + 'positions.bin', 'arraybuffer')
  ]);

  const source = Buffer.from(arrayBuffer);
  if (source.length % RECORD_BYTES !== 0) {
    throw new Error('Unexpected positions.bin byte length: ' + source.length);
  }

  const recordCount = source.length / RECORD_BYTES;
  if (meta.count && meta.count !== recordCount) {
    throw new Error(
      'meta.json count (' + meta.count + ') does not match positions.bin (' + recordCount + ')'
    );
  }

  // Allocate at the source upper bound, then trim to the actual deterministic
  // sample. This avoids relying on the binomial sample count staying close to
  // exactly 1/8.
  const sampled = Buffer.allocUnsafe(source.length);
  let selected = 0;

  for (let i = 0; i < recordCount; ++i) {
    if (!keepRecord(i)) continue;
    const srcStart = i * RECORD_BYTES;
    source.copy(
      sampled,
      selected * RECORD_BYTES,
      srcStart,
      srcStart + RECORD_BYTES
    );
    selected += 1;
  }

  const output = sampled.subarray(0, selected * RECORD_BYTES);
  await mkdir(OUT_BGS, { recursive: true });

  const chunkCount = Math.ceil(selected / CHUNK_RECORDS);
  const chunkBuffers = Array.from({ length: chunkCount }, function(_, chunkIndex) {
    const records = Math.ceil((selected - chunkIndex) / chunkCount);
    return Buffer.allocUnsafe(records * RECORD_BYTES);
  });
  const chunkOffsets = new Array(chunkCount).fill(0);

  // Interleave records across chunks so every individual chunk samples the
  // whole catalogue ordering. Chunk 0 is therefore a useful full-footprint
  // preview rather than merely the first contiguous catalogue segment.
  for (let record = 0; record < selected; ++record) {
    const chunkIndex = record % chunkCount;
    const srcStart = record * RECORD_BYTES;
    const dstStart = chunkOffsets[chunkIndex] * RECORD_BYTES;
    output.copy(chunkBuffers[chunkIndex], dstStart, srcStart, srcStart + RECORD_BYTES);
    chunkOffsets[chunkIndex] += 1;
  }

  const chunks = [];
  const chunkWrites = chunkBuffers.map(function(buffer, chunkIndex) {
    const name = chunkName(chunkIndex);
    chunks.push(name);
    return writeFile(path.join(OUT_BGS, name), buffer);
  });

  const mobileMeta = {
    id: meta.id || 'bgs',
    name: meta.name || 'BGS',
    count: selected,
    color: meta.color || '0x24bddcff',
    source_count: recordCount,
    sample_fraction: selected / recordCount,
    chunks: chunks,
    chunk_records: CHUNK_RECORDS
  };

  const mobileManifest = {
    tracers: ['bgs'],
    mobile_sample: true,
    source_count: recordCount,
    sample_count: selected
  };

  await Promise.all([
    writeFile(path.join(OUT_ROOT, 'manifest.json'), JSON.stringify(mobileManifest)),
    writeFile(path.join(OUT_BGS, 'meta.json'), JSON.stringify(mobileMeta)),
    ...chunkWrites
  ]);

  console.log(
    'Mobile BGS: ' + selected.toLocaleString('en-US') + ' / ' +
    recordCount.toLocaleString('en-US') + ' galaxies'
  );
  console.log(
    'Chunked positions: ' + chunks.length + ' files, ~' +
    Math.round(CHUNK_RECORDS * RECORD_BYTES / 1024) + ' KiB each; total ' +
    (output.length / 1024 / 1024).toFixed(2) + ' MiB'
  );
}

main().catch(function(err) {
  console.error(err);
  process.exit(1);
});
