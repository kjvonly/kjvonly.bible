import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';

const converter = fileURLToPath(new URL('./convert-dictionary-bundle.mjs', import.meta.url));

/** Executes the converter against an isolated source and destination. */
function convert(t, source, extension = 'json') {
  const dir = mkdtempSync(join(tmpdir(), 'dictionary-converter-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const input = join(dir, `input.${extension}`);
  const output = join(dir, 'dictionary.json.gz');
  writeFileSync(input, source);
  const result = spawnSync(process.execPath, [converter, input, output], { encoding: 'utf8' });
  return { ...result, output };
}

test('skips blank fields, logs headwords and positions, and retains valid definitions', t => {
  const result = convert(t, JSON.stringify([
    { word: 'aam', content: '<p>First</p>' },
    { word: 'bin', content: '' },
    { word: ' ', content: '<p>No headword</p>' },
    { word: 'aam', content: '<p>Second</p>' },
    null,
    { word: 'c', content: 42 }
  ]));

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /record 2 \(word: "bin"\): content empty/);
  assert.match(result.stderr, /record 3 .*word empty/);
  assert.match(result.stderr, /record 5 .*word missing or not a string, content missing or not a string/);
  assert.match(result.stderr, /record 6 .*content missing or not a string/);
  assert.match(result.stdout, /1 headwords \(2 definitions, 4 skipped\)/);
  assert.deepEqual(JSON.parse(gunzipSync(readFileSync(result.output))), {
    definitionFormat: 'webster-html',
    headwords: [{ headword: 'aam', key: 'aam' }],
    definitions: { aam: [
      { word: 'aam', content: '<p>First</p>' },
      { word: 'aam', content: '<p>Second</p>' }
    ] }
  });
});

test('supports NDJSON records with missing content', t => {
  const result = convert(t, '{"word":"bin"}\n{"word":"aam","content":"<p>Valid</p>"}\n', 'ndjson');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /record 1 \(word: "bin"\): content missing or not a string/);
  assert.match(result.stdout, /1 definitions, 1 skipped/);
});

test('fails malformed JSON instead of silently skipping input', t => {
  const result = convert(t, '[{"word":"a","content":"x"},]');
  assert.notEqual(result.status, 0);
  assert.equal(existsSync(result.output), false);
});

test('fails if every record is invalid', t => {
  const result = convert(t, JSON.stringify([{ word: 'bin', content: '' }]));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /no valid records/);
  assert.equal(existsSync(result.output), false);
});


test('repacks existing keyed Webster gzip without losing ordered HTML definitions', t => {
  const dir = mkdtempSync(join(tmpdir(), 'dictionary-repack-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const input = join(dir, 'webster.json.gz');
  const output = join(dir, 'repacked.json.gz');
  const existing = { aam: [{ word: 'AAM', content: '<p>First</p>' }, { word: 'AAM', content: '<p>Second</p>' }] };
  writeFileSync(input, gzipSync(JSON.stringify(existing)));
  const result = spawnSync(process.execPath, [converter, input, output], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const data = JSON.parse(gunzipSync(readFileSync(output)));
  assert.deepEqual(data.definitions, existing);
  assert.deepEqual(data.headwords, [{ headword: 'aam', key: 'aam' }]);
});
