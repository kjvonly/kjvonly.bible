import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { gunzipSync, gzipSync } from 'node:zlib';
import { buildIndexFile, createHeadwordDocument, createHeadwordDocumentIndex, createPublishedIndex, encodeHeadwordForSearch } from './build-dictionary-headword-index.mjs';

/** Record the indexed documents without depending on npm during the Node-only tests. */
class RecordingDocument {
  constructor(options) { this.options = options; this.entries = []; }
  add(document) { this.entries.push(document); }
  async export(write) { await write('reg', JSON.stringify(this.entries)); }
}

const bundle = {
  definitionFormat: 'webster-html',
  headwords: ['a b', 'abandon', 'étude'].map(key => ({ headword: key, key })),
  definitions: {
    'a b': [{ word: 'A B', content: '<p>first definition</p>' }],
    abandon: [{ word: 'abandon', content: '<p>definition</p>' }],
    'étude': [{ word: 'étude', content: '<p>definition</p>' }]
  }
};
const id = 'kjvonly/dictionary/entries/webster-1828';

test('preserves the worker prefix encoding, sorted headwords, and definition-free export', async () => {
  const index = createHeadwordDocumentIndex(RecordingDocument);
  const result = await createPublishedIndex(bundle, id, 'a'.repeat(64), index);
  assert.equal(result.headwordCount, 3);
  assert.equal(result.formatVersion, 1);
  assert.equal(result.tokenizer, 'forward');
  assert.deepEqual(index.entries.map(entry => entry.headword), ['a b', 'abandon', 'étude']);
  assert.deepEqual(index.entries[0], createHeadwordDocument('a b', 'a b'));
  assert.equal(index.entries[1].searchableHeadword.startsWith(encodeHeadwordForSearch('ab')), true);
  assert.equal(index.entries[1].searchableKey, encodeHeadwordForSearch('abandon'));
  assert.equal(JSON.stringify(result).includes('first definition'), false);
  assert.equal(index.options.encode, false);
  assert.deepEqual(index.options.document, { id: 'id', index: ['searchableHeadword', 'searchableKey'], store: ['headword', 'key'] });
});

test('writes a gzip index tied to the exact original dictionary bytes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dictionary-index-'));
  try {
    const source = join(dir, 'webster.json.gz');
    const destination = join(dir, 'index.json.gz');
    await writeFile(source, gzipSync(JSON.stringify(bundle)));
    const result = await buildIndexFile(source, destination, id, RecordingDocument);
    assert.deepEqual(JSON.parse(gunzipSync(await readFile(destination)).toString('utf8')), result);
    assert.match(result.sourceSha256, /^[a-f0-9]{64}$/);
    await assert.rejects(() => buildIndexFile(source, source, id, RecordingDocument), /overwrite/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('rejects malformed keys and missing definitions', async () => {
  const mk = () => createHeadwordDocumentIndex(RecordingDocument);
  await assert.rejects(createPublishedIndex({ ...bundle, headwords: [{ headword: 'Ab', key: 'abandon' }] }, id, 'a'.repeat(64), mk()), /Invalid Dictionary headword/);
  await assert.rejects(createPublishedIndex({ ...bundle, headwords: [{ headword: 'a', key: 'missing' }] }, id, 'a'.repeat(64), mk()), /Missing Dictionary definition/);
  await assert.rejects(createPublishedIndex(bundle, 'wrong-id', 'a'.repeat(64), mk()), /Invalid Dictionary Resource ID/);
});

test('published records preserve multiple keys and aliases without storing definitions', async () => {
  const extra = {
    definitionFormat: 'strongs',
    headwords: [
      { headword: 'love', key: 'G25' },
      { headword: 'love', key: 'G26' },
      { headword: 'charity', key: 'G26' }
    ],
    definitions: { G25: { number: 'G25' }, G26: { number: 'G26' } }
  };
  const document = createHeadwordDocumentIndex(RecordingDocument);
  const output = await createPublishedIndex(extra, id, 'a'.repeat(64), document);
  assert.equal(output.headwordCount, 3);
  assert.deepEqual(document.entries.map(({ headword, key }) => [headword, key]),
    [['charity', 'G26'], ['love', 'G25'], ['love', 'G26']]);
  assert.equal(JSON.stringify(output).includes('number'), false);
});

// On a developer workstation this verifies the actual app FlexSearch serialization.
// The code-only test environment may not have npm dependencies installed.
import { createRequire } from 'node:module';
const requireFromPwa = createRequire(new URL('../../../client/kjvonly-pwa/package.json', import.meta.url));
let FlexSearchDocument;
try { FlexSearchDocument = requireFromPwa('flexsearch').Document; } catch { /* node_modules not available */ }

test('real Document export/import returns headwords and keys for whole-word prefixes', { skip: !FlexSearchDocument }, async () => {
  const exported = await createPublishedIndex(
    bundle, id, 'a'.repeat(64), createHeadwordDocumentIndex(FlexSearchDocument)
  );
  const imported = createHeadwordDocumentIndex(FlexSearchDocument);
  for (const [key, data] of Object.entries(exported.chunks)) await imported.import(key, data);
  const results = await imported.searchAsync(encodeHeadwordForSearch('ab'), { enrich: true, limit: 10 });
  assert.deepEqual(results.flatMap(group => group.result.map(hit => hit.doc)),
    [{ headword: 'abandon', key: 'abandon' }]);
  assert.deepEqual(await imported.searchAsync(encodeHeadwordForSearch('b'), { enrich: true, limit: 10 }), []);
});

test('composite document identities support repeated words and repeated definition keys', { skip: !FlexSearchDocument }, async () => {
  const index = createHeadwordDocumentIndex(FlexSearchDocument);
  for (const [headword, key] of [['love', 'G25'], ['love', 'G26'], ['charity', 'G26']]) {
    index.add(createHeadwordDocument(headword, key));
  }
  const chunks = {};
  await index.export((key, data) => { chunks[key] = data ?? ''; });
  const restored = createHeadwordDocumentIndex(FlexSearchDocument);
  for (const [key, data] of Object.entries(chunks)) await restored.import(key, data);
  const search = async headword => (await restored.searchAsync(encodeHeadwordForSearch(headword),
    { enrich: true, limit: 10 })).flatMap(group => group.result.map(hit => hit.doc));
  assert.deepEqual((await search('love')).sort((a, b) => a.key.localeCompare(b.key)),
    [{ headword: 'love', key: 'G25' }, { headword: 'love', key: 'G26' }]);
  assert.deepEqual(await search('charity'), [{ headword: 'charity', key: 'G26' }]);
});


test('the published index searches definition keys as well as headwords', { skip: !FlexSearchDocument }, async () => {
  const strongs = {
    definitionFormat: 'strongs',
    headwords: [
      { headword: 'alpha', key: 'G1' },
      { headword: 'another', key: 'G1' },
      { headword: 'beginning', key: 'H1' },
      { headword: 'alphabet', key: 'G10' }
    ],
    definitions: { G1: { number: 'G1' }, G10: { number: 'G10' }, H1: { number: 'H1' } }
  };
  const exported = await createPublishedIndex(
    strongs, 'kjvonly/dictionary/entries/strongs-kjvs', 'a'.repeat(64),
    createHeadwordDocumentIndex(FlexSearchDocument)
  );
  const restored = createHeadwordDocumentIndex(FlexSearchDocument);
  for (const [key, data] of Object.entries(exported.chunks)) await restored.import(key, data);
  const search = query => restored.search(encodeHeadwordForSearch(query), { enrich: true, limit: 10 })
    .flatMap(field => field.result.map(hit => hit.doc));
  assert.deepEqual(search('g1').map(match => [match.headword, match.key]).sort(),
    [['alpha', 'G1'], ['alphabet', 'G10'], ['another', 'G1']]);
  assert.deepEqual(search('h1'), [{ headword: 'beginning', key: 'H1' }]);
  assert.deepEqual(search('alpha').map(match => [match.headword, match.key]).sort(),
    [['alpha', 'G1'], ['alphabet', 'G10']]);
});
