import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { gzipSync, gunzipSync } from 'node:zlib';
import {
  buildStrongsDictionaryEditionFile, createStrongsDictionaryEdition,
  getWordStrongsKeys, normalizeBibleHeadword
} from './build-strongs-dictionary-edition.mjs';
import { validateBundle } from './build-dictionary-headword-index.mjs';

const definitions = {
  H7225: { number: 'H7225', originalWord: 'רֵאשִׁית' },
  H1254: { number: 'H1254', originalWord: 'בָּרָא' },
  H853: { number: 'H853', originalWord: 'אֵת' },
  G25: { number: 'G25', originalWord: 'ἀγαπάω' },
  G26: { number: 'G26', originalWord: 'ἀγάπη' },
  G1: { number: 'G1', originalWord: 'Α' }
};

const word = (text, ...href) => ({ text, href: href.length ? href : null });
const chapterBundle = {
  'kjvs/1_1': {
    verses: {
      1: { words: [
        word('In'), word('the'), word('be\u00adginning', 'H7225;23/102/25'),
        word('created', 'H1254;H853'), word('earth.', 'H853'),
        word('love', 'G25;G26'), word('love', 'G25')
      ] },
      2: { words: [word('beginning', 'H7225'), word('charity', 'G26'), word('And', '1/2/4')] }
    }
  }
};

test('takes only G/H IDs from the token itself, not Scripture cross-references', () => {
  assert.deepEqual(getWordStrongsKeys(['H7225;23/102/25;H853', 'G25;H853']), ['H7225', 'H853', 'G25']);
  assert.deepEqual(getWordStrongsKeys(null), []);
  assert.deepEqual(getWordStrongsKeys(['30/4/23']), []);
});

test('normalizes Bible punctuation and soft hyphens before indexing', () => {
  assert.equal(normalizeBibleHeadword('be\u00adginning'), 'beginning');
  assert.equal(normalizeBibleHeadword('EARTH.'), 'earth');
  assert.equal(normalizeBibleHeadword('“Love!”'), 'love');
  assert.equal(normalizeBibleHeadword("Lord's"), "lord's");
});

test('produces one generic Strong\'s edition with distinct headword/key pairs', () => {
  const result = createStrongsDictionaryEdition(definitions, chapterBundle);
  assert.equal(result.chapterCount, 1);
  assert.equal(result.definitionCount, 6);
  assert.deepEqual(result.bundle.headwords, [
    { headword: 'beginning', key: 'H7225' },
    { headword: 'charity', key: 'G26' },
    { headword: 'created', key: 'H1254' },
    { headword: 'created', key: 'H853' },
    { headword: 'earth', key: 'H853' },
    { headword: 'love', key: 'G25' },
    { headword: 'love', key: 'G26' }
  ]);
  assert.equal(result.associationCount, 7);
  assert.deepEqual(result.missingDefinitionKeys, []);
  assert.equal(result.bundle.definitionFormat, 'strongs');
  assert.deepEqual(result.bundle.definitions.G1, definitions.G1); // Unmapped definitions remain directly retrievable.
  assert.equal(result.bundle.headwords.some(item => item.headword === 'in'), false);
  validateBundle(result.bundle);
});

test('skips references without definitions while preserving valid mappings', () => {
  const result = createStrongsDictionaryEdition(definitions, {
    'kjvs/1_1': { verses: { 1: { words: [
      word('love', 'G26;G9999'),
      word('missing', 'H9999;G9999'),
      word('beginning', 'H7225')
    ] } } }
  });
  assert.deepEqual(result.missingDefinitionKeys, ['G9999', 'H9999']);
  assert.deepEqual(result.bundle.headwords, [
    { headword: 'beginning', key: 'H7225' },
    { headword: 'love', key: 'G26' }
  ]);
  assert.equal(result.definitionCount, Object.keys(definitions).length);
  assert.equal(result.associationCount, 2);
  validateBundle(result.bundle);
});

test('still rejects invalid definition IDs and a Bible bundle with no usable associations', () => {
  assert.throws(() => createStrongsDictionaryEdition({ G25: { number: 'G26' } }, chapterBundle), /identity/);
  assert.throws(() => createStrongsDictionaryEdition(definitions, {
    'kjvs/1_1': { verses: { 1: { words: [word('word', 'H9999')] } } }
  }), /no Strong's word associations/);
});

test('writes gzip without changing either source bundle', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'strongs-dictionary-'));
  try {
    const source = join(dir, 'strongs.json.gz');
    const bible = join(dir, 'kjvs.json.gz');
    const output = join(dir, 'strongs-kjvs.json.gz');
    const sourceBytes = gzipSync(JSON.stringify(definitions));
    const bibleBytes = gzipSync(JSON.stringify(chapterBundle));
    await writeFile(source, sourceBytes);
    await writeFile(bible, bibleBytes);
    const result = await buildStrongsDictionaryEditionFile(source, bible, output);
    assert.deepEqual(JSON.parse(gunzipSync(await readFile(output)).toString('utf8')), result.bundle);
    assert.deepEqual(await readFile(source), sourceBytes);
    assert.deepEqual(await readFile(bible), bibleBytes);
    await assert.rejects(() => buildStrongsDictionaryEditionFile(source, bible, source), /overwrite/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
