import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { gunzipSync, gzipSync } from 'node:zlib';
import { buildIndexFile, createPublishedIndex, encodeHeadwordForSearch } from './build-dictionary-headword-index.mjs';

/** Test double records the same headword/encoded-string pairs passed to FlexSearch. */
class RecordingIndex {
  static last;
  constructor(options) { this.options = options; this.entries = []; RecordingIndex.last = this; }
  add(id, value) { this.entries.push([id, value]); }
  async export(write) { await write('reg', JSON.stringify(this.entries)); }
}

const bundle = {
  'a b': [{ word: 'A B', content: '<p>first definition</p>' }],
  abandon: [{ word: 'abandon', content: '<p>definition</p>' }],
  'étude': [{ word: 'étude', content: '<p>definition</p>' }]
};
const id = 'kjvonly/dictionary/entries/webster-1828';

test('preserves the worker prefix encoding, sorted headwords, and definition-free export', async () => {
  const index = new RecordingIndex({ tokenize: 'forward', encode: false });
  const result = await createPublishedIndex(bundle, id, 'a'.repeat(64), index);
  assert.equal(result.headwordCount, 3);
  assert.equal(result.formatVersion, 1);
  assert.equal(result.tokenizer, 'forward');
  assert.deepEqual(index.entries.map(([key]) => key), ['a b', 'abandon', 'étude']);
  assert.equal(index.entries[0][1], encodeHeadwordForSearch('a b'));
  assert.equal(index.entries[1][1].startsWith(encodeHeadwordForSearch('ab')), true);
  assert.equal(JSON.stringify(result).includes('first definition'), false);
  assert.equal(index.options.encode, false);
});

test('writes a gzip index tied to the exact original dictionary bytes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dictionary-index-'));
  try {
    const source = join(dir, 'webster.json.gz');
    const destination = join(dir, 'index.json.gz');
    await writeFile(source, gzipSync(JSON.stringify(bundle)));
    const result = await buildIndexFile(source, destination, id, RecordingIndex);
    assert.deepEqual(JSON.parse(gunzipSync(await readFile(destination)).toString('utf8')), result);
    assert.match(result.sourceSha256, /^[a-f0-9]{64}$/);
    await assert.rejects(() => buildIndexFile(source, source, id, RecordingIndex), /overwrite/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('rejects malformed keys and missing definitions', async () => {
  const mk = () => new RecordingIndex({ tokenize: 'forward', encode: false });
  await assert.rejects(createPublishedIndex({ Ab: bundle.abandon }, id, 'a'.repeat(64), mk()), /Invalid Dictionary headword/);
  await assert.rejects(createPublishedIndex({ a: [{ word: 'a', content: '' }] }, id, 'a'.repeat(64), mk()), /Invalid Dictionary definition/);
  await assert.rejects(createPublishedIndex(bundle, 'wrong-id', 'a'.repeat(64), mk()), /Invalid Dictionary Resource ID/);
});

// On a developer workstation this verifies the actual app FlexSearch serialization.
// The code-only test environment may not have npm dependencies installed.
import { createRequire } from 'node:module';
const requireFromPwa = createRequire(new URL('../../../client/kjvonly-pwa/package.json', import.meta.url));
let FlexSearchIndex;
try { FlexSearchIndex = requireFromPwa('flexsearch').Index; } catch { /* node_modules not available */ }

test('real FlexSearch export imports and matches whole-headword prefixes', { skip: !FlexSearchIndex }, async () => {
  const exported = await createPublishedIndex(
    bundle, id, 'a'.repeat(64), new FlexSearchIndex({ tokenize: 'forward', encode: false })
  );
  const imported = new FlexSearchIndex({ tokenize: 'forward', encode: false });
  for (const [key, data] of Object.entries(exported.chunks)) await imported.import(key, data);
  assert.deepEqual(await imported.searchAsync(encodeHeadwordForSearch('ab'), 10), ['abandon']);
  assert.deepEqual(await imported.searchAsync(encodeHeadwordForSearch('b'), 10), []);
});
