#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';

/** Published payload version. Changing normalization or FlexSearch export requires a new version. */
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

/** Reject invalid input before publishing a misleading partial index. */
export function validateBundle(bundle) {
  if (bundle === null || typeof bundle !== 'object' || Array.isArray(bundle) || Object.keys(bundle).length === 0) {
    throw new Error('Dictionary input must be a nonempty keyed bundle.');
  }
  for (const [key, definitions] of Object.entries(bundle)) {
    if (!key || key !== normalizeHeadword(key) || !Array.isArray(definitions) || definitions.length === 0) {
      throw new Error(`Invalid Dictionary headword: ${JSON.stringify(key)}`);
    }
    for (const definition of definitions) {
      if (!definition || typeof definition !== 'object' || Array.isArray(definition) ||
        typeof definition.word !== 'string' || !definition.word.trim() ||
        typeof definition.content !== 'string' || !definition.content.trim()) {
        throw new Error(`Invalid Dictionary definition for headword: ${JSON.stringify(key)}`);
      }
    }
  }
}

/** Construct a portable, publisher-independent FlexSearch export for one complete edition. */
export async function createPublishedIndex(bundle, resourceId, sourceSha256, index) {
  if (!/^kjvonly\/dictionary\/entries\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(resourceId)) {
    throw new Error(`Invalid Dictionary Resource ID: ${resourceId}`);
  }
  if (!/^[a-f0-9]{64}$/.test(sourceSha256)) throw new Error('Source SHA-256 must be a lowercase hex digest.');
  validateBundle(bundle);
  const headwords = Object.keys(bundle).sort();
  for (const headword of headwords) index.add(headword, encodeHeadwordForSearch(headword));
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

/** Read the existing compressed v1 bundle and write an independently compressed index. */
export async function buildIndexFile(sourcePath, destinationPath, resourceId, Index) {
  if (!destinationPath.endsWith('.json.gz')) throw new Error('Output filename must end in .json.gz');
  if (resolve(sourcePath) === resolve(destinationPath)) throw new Error('Refusing to overwrite the source Dictionary Resource.');
  const source = await readFile(sourcePath);
  const sourceSha256 = createHash('sha256').update(source).digest('hex');
  const bundle = JSON.parse(gunzipSync(source).toString('utf8'));
  const index = new Index({ tokenize: TOKENIZER, encode: false });
  const output = await createPublishedIndex(bundle, resourceId, sourceSha256, index);
  await mkdir(dirname(destinationPath), { recursive: true });
  await writeFile(destinationPath, gzipSync(JSON.stringify(output), { level: 9 }));
  return output;
}

/** Use the app's installed FlexSearch dependency rather than introducing another version. */
function loadFlexSearch() {
  const requireFromPwa = createRequire(new URL('../../../client/kjvonly-pwa/package.json', import.meta.url));
  try {
    return requireFromPwa('flexsearch').Index;
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
