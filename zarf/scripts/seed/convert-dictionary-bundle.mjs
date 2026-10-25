#!/usr/bin/env node

import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';

/** Normalizes lookup keys to the Dictionary Domain's V1 identity policy. */
function normalizeHeadword(word) {
  return word.normalize('NFKC').toLowerCase().trim().replace(/\s+/gu, ' ');
}

/** Reads either a JSON record array or one JSON record per line (NDJSON). */
function parseRecords(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith('[')) {
    const records = JSON.parse(trimmed);
    if (!Array.isArray(records)) throw new Error('Expected a JSON array of dictionary records.');
    return records;
  }
  return trimmed.split(/\r?\n/u)
    .filter(line => line.trim())
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`Invalid NDJSON record on line ${index + 1}: ${error.message}`);
      }
    });
}

/** Describes required fields that are missing, blank, or of the wrong type. */
function invalidRecordFields(record) {
  const fields = [];
  for (const field of ['word', 'content']) {
    const value = record !== null && typeof record === 'object' && !Array.isArray(record)
      ? record[field]
      : undefined;
    if (typeof value !== 'string') fields.push(`${field} missing or not a string`);
    else if (!value.trim()) fields.push(`${field} empty`);
  }
  return fields;
}

/** Groups valid records by normalized headword, reporting and skipping invalid records. */
function groupDefinitions(records) {
  const definitions = Object.create(null);
  let skipped = 0;
  let included = 0;
  for (const [index, record] of records.entries()) {
    const invalidFields = invalidRecordFields(record);
    if (invalidFields.length > 0) {
      const word = typeof record?.word === 'string' ? JSON.stringify(record.word) : '(missing)';
      console.warn(`Skipping dictionary record ${index + 1} (word: ${word}): ${invalidFields.join(', ')}.`);
      skipped++;
      continue;
    }
    const key = normalizeHeadword(record.word);
    if (!key) {
      console.warn(`Skipping dictionary record ${index + 1} (word: ${JSON.stringify(record.word)}): normalized headword empty.`);
      skipped++;
      continue;
    }
    (definitions[key] ??= []).push({ word: record.word, content: record.content });
    included++;
  }
  if (included === 0) throw new Error('Dictionary bundle has no valid records.');
  return {
    bundle: Object.fromEntries(Object.keys(definitions).sort().map(key => [key, definitions[key]])),
    included,
    skipped
  };
}

/** Wrap existing keyed Webster data or record input in the standard edition contract. */
function createEdition(definitions) {
  return {
    definitionFormat: 'webster-html',
    headwords: Object.keys(definitions).sort().map(key => ({ headword: key, key })),
    definitions
  };
}

/** Convert a previously generated keyed gzip file without requiring raw source records. */
function readKeyedGzip(bytes) {
  const keyed = JSON.parse(gunzipSync(bytes).toString('utf8'));
  if (!keyed || typeof keyed !== 'object' || Array.isArray(keyed) || !Object.keys(keyed).length) {
    throw new Error('Expected a nonempty keyed Webster bundle.');
  }
  for (const [key, definitions] of Object.entries(keyed)) {
    if (!key || key !== normalizeHeadword(key) || !Array.isArray(definitions) || !definitions.length ||
        definitions.some(entry => invalidRecordFields(entry).length || normalizeHeadword(entry.word) !== key)) {
      throw new Error(`Invalid keyed Webster definition: ${JSON.stringify(key)}`);
    }
  }
  return keyed;
}

/** Converts source data into the single current gzipped edition format. */
async function main() {
  const [sourcePath, destinationPath, ...extra] = process.argv.slice(2);
  if (!sourcePath || !destinationPath || extra.length !== 0 || !destinationPath.endsWith('.json.gz')) {
    throw new Error('Usage: node zarf/scripts/seed/convert-dictionary-bundle.mjs <source.json|source.ndjson|keyed.json.gz> <destination.json.gz>');
  }
  let definitions;
  let included;
  let skipped = 0;
  if (sourcePath.endsWith('.json.gz')) {
    definitions = readKeyedGzip(await readFile(sourcePath));
    included = Object.values(definitions).reduce((sum, entries) => sum + entries.length, 0);
  } else {
    const parsed = groupDefinitions(parseRecords(await readFile(sourcePath, 'utf8')));
    definitions = parsed.bundle;
    included = parsed.included;
    skipped = parsed.skipped;
  }
  const bundle = createEdition(definitions);
  await mkdir(dirname(destinationPath), { recursive: true });
  await writeFile(destinationPath, gzipSync(JSON.stringify(bundle), { level: 9 }));
  console.log(`Wrote ${bundle.headwords.length} headwords (${included} definitions, ${skipped} skipped) to ${destinationPath}`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
