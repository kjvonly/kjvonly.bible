#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';

/** Development index contract: replace the export format in place without version increments. */
export const FORMAT_VERSION = 1;
export const TOKENIZER = 'forward';
export const ENCODING = 'codepoint-base36-padded4';

/** Match the Dictionary Domain's V1 canonical headword identity policy. */
export function normalizeHeadword(word) {
  return word.normalize('NFKC').toLowerCase().trim().replace(/\s+/gu, ' ');
}

/** Match the Dictionary search worker's whole-headword prefix encoding exactly. */
export function encodeHeadwordForSearch(word) {
  return Array.from(word, char => char.codePointAt(0).toString(36).padStart(4, '0')).join('');
}

/** Verify every published search association resolves to one definition key. */
export function validateBundle(bundle) {
  if (!bundle || typeof bundle !== 'object' || Array.isArray(bundle) ||
      typeof bundle.definitionFormat !== 'string' || !bundle.definitionFormat.trim() ||
      !Array.isArray(bundle.headwords) || !bundle.headwords.length ||
      !bundle.definitions || typeof bundle.definitions !== 'object' || Array.isArray(bundle.definitions) ||
      !Object.keys(bundle.definitions).length) {
    throw new Error('Invalid Dictionary edition bundle.');
  }
  const pairs = new Set();
  for (const [key, definition] of Object.entries(bundle.definitions)) {
    if (!key || definition === null || definition === undefined) {
      throw new Error(`Invalid Dictionary definition key: ${JSON.stringify(key)}`);
    }
  }
  for (const match of bundle.headwords) {
    if (!match || typeof match.headword !== 'string' || !match.headword ||
        match.headword !== normalizeHeadword(match.headword) ||
        typeof match.key !== 'string' || !match.key) {
      throw new Error('Invalid Dictionary headword association.');
    }
    if (!Object.hasOwn(bundle.definitions, match.key)) {
      throw new Error(`Missing Dictionary definition for key ${JSON.stringify(match.key)}.`);
    }
    const pair = JSON.stringify([match.headword, match.key]);
    if (pairs.has(pair)) {
      throw new Error(`Duplicate Dictionary headword association: ${pair}.`);
    }
    pairs.add(pair);
  }
}

/** Each association has its own stable ID, even when words or definition keys repeat. */
export function createHeadwordDocument(headword, key) {
  return {
    id: JSON.stringify([headword, key]),
    headword,
    key,
    searchableHeadword: encodeHeadwordForSearch(headword),
    searchableKey: encodeHeadwordForSearch(normalizeHeadword(key))
  };
}

/** Configure one Document index for any Dictionary edition's headword/key associations. */
export function createHeadwordDocumentIndex(Document) {
  return new Document({
    tokenize: TOKENIZER,
    encode: false,
    document: {
      id: 'id',
      index: ['searchableHeadword', 'searchableKey'],
      store: ['headword', 'key']
    }
  });
}

/** Construct a portable, publisher-independent FlexSearch Document export for one edition. */
export async function createPublishedIndex(bundle, resourceId, sourceSha256, index) {
  if (!/^kjvonly\/dictionary\/entries\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(resourceId)) {
    throw new Error(`Invalid Dictionary Resource ID: ${resourceId}`);
  }
  if (!/^[a-f0-9]{64}$/.test(sourceSha256)) throw new Error('Source SHA-256 must be a lowercase hex digest.');
  validateBundle(bundle);
  const headwords = [...bundle.headwords].sort((a, b) =>
    a.headword < b.headword ? -1 : a.headword > b.headword ? 1 :
      a.key < b.key ? -1 : a.key > b.key ? 1 : 0
  );
  for (const { headword, key } of headwords) {
    index.add(createHeadwordDocument(headword, key));
  }
  const chunks = {};
  await index.export((key, data) => { chunks[key] = data ?? ''; });
  if (Object.keys(chunks).length === 0) throw new Error('FlexSearch exported no index chunks.');
  return {
    resourceId,
    sourceSha256,
    formatVersion: FORMAT_VERSION,
    tokenizer: TOKENIZER,
    encoding: ENCODING,
    headwordCount: headwords.length,
    chunks
  };
}

/** Read the published edition bundle and export its searchable associations without definitions. */
export async function buildIndexFile(sourcePath, destinationPath, resourceId, Document) {
  if (!destinationPath.endsWith('.json.gz')) throw new Error('Output filename must end in .json.gz');
  if (resolve(sourcePath) === resolve(destinationPath)) throw new Error('Refusing to overwrite the source Dictionary Resource.');
  const source = await readFile(sourcePath);
  const sourceSha256 = createHash('sha256').update(source).digest('hex');
  const bundle = JSON.parse(gunzipSync(source).toString('utf8'));
  const index = createHeadwordDocumentIndex(Document);
  const output = await createPublishedIndex(bundle, resourceId, sourceSha256, index);
  await mkdir(dirname(destinationPath), { recursive: true });
  await writeFile(destinationPath, gzipSync(JSON.stringify(output), { level: 9 }));
  return output;
}

/** Use the app's installed FlexSearch dependency rather than introducing another version. */
function loadFlexSearch() {
  const requireFromPwa = createRequire(new URL('../../../client/kjvonly-pwa/package.json', import.meta.url));
  try {
    return requireFromPwa('flexsearch').Document;
  } catch (error) {
    throw new Error('Install client/kjvonly-pwa dependencies first (npm --prefix client/kjvonly-pwa ci).', { cause: error });
  }
}

/** Generate the Blossom-bound artifact; existing app-data manifests perform upload/publication. */
async function main() {
  const [source, destination, resourceId, ...extra] = process.argv.slice(2);
  if (!source || !destination || !resourceId || extra.length !== 0) {
    throw new Error('Usage: node zarf/scripts/seed/build-dictionary-headword-index.mjs <dictionary.json.gz> <index.json.gz> <dictionary-resource-id>');
  }
  const result = await buildIndexFile(source, destination, resourceId, loadFlexSearch());
  console.info(`Wrote ${result.headwordCount} headwords to ${destination} (source SHA-256 ${result.sourceSha256}).`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
