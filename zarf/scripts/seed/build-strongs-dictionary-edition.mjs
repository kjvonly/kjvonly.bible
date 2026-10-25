#!/usr/bin/env node

import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';
import { normalizeHeadword } from './build-dictionary-headword-index.mjs';

const STRONGS_ID = /^[GH]\d+$/u;
const DICTIONARY_FORMAT = 'strongs';

/** Normalize an English Bible token, retaining internal punctuation but not surrounding punctuation. */
export function normalizeBibleHeadword(text) {
  return normalizeHeadword(text.replace(/\u00ad/gu, '')
    .replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, ''));
}

/** Only the word's own G/H references contribute headword associations. */
export function getWordStrongsKeys(hrefs) {
  if (!Array.isArray(hrefs)) return [];
  const keys = new Set();
  for (const href of hrefs) {
    if (typeof href !== 'string') continue;
    for (const reference of href.split(';')) {
      const key = reference.trim();
      if (STRONGS_ID.test(key)) keys.add(key);
    }
  }
  return [...keys];
}

function requireRecord(value, description) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Expected ${description} to be an object.`);
  }
  return value;
}

/** Build one Dictionary edition from Strong's definitions and Bible word references. */
export function createStrongsDictionaryEdition(strongsBundle, bibleBundle) {
  requireRecord(strongsBundle, "Strong's definitions bundle");
  requireRecord(bibleBundle, 'KJVS chapter bundle');

  const definitionKeys = Object.keys(strongsBundle).sort();
  if (!definitionKeys.length) throw new Error("Strong's definitions bundle is empty.");
  const definitions = {};
  for (const key of definitionKeys) {
    const definition = requireRecord(strongsBundle[key], `Strong's definition ${key}`);
    if (!STRONGS_ID.test(key) || definition.number !== key) {
      throw new Error(`Invalid Strong's definition identity: ${key}.`);
    }
    definitions[key] = definition;
  }

  const associations = new Set();
  const missingDefinitions = new Set();
  let chapterCount = 0;
  for (const [chapterId, chapterValue] of Object.entries(bibleBundle)) {
    const chapter = requireRecord(chapterValue, `Bible chapter ${chapterId}`);
    const verses = requireRecord(chapter.verses, `verses in ${chapterId}`);
    chapterCount++;
    for (const [verseId, verseValue] of Object.entries(verses)) {
      const verse = requireRecord(verseValue, `verse ${chapterId}:${verseId}`);
      if (!Array.isArray(verse.words)) {
        throw new Error(`Missing words in Bible verse ${chapterId}:${verseId}.`);
      }
      for (const word of verse.words) {
        const keys = getWordStrongsKeys(word?.href);
        if (!keys.length) continue;
        if (typeof word.text !== 'string') {
          throw new Error(`Invalid linked Bible word in ${chapterId}:${verseId}.`);
        }
        const headword = normalizeBibleHeadword(word.text);
        if (!headword) {
          throw new Error(`Empty linked Bible headword in ${chapterId}:${verseId}.`);
        }
        for (const key of keys) {
          if (!Object.hasOwn(definitions, key)) {
            missingDefinitions.add(key);
          } else {
            associations.add(JSON.stringify([headword, key]));
          }
        }
      }
    }
  }

  if (!associations.size) throw new Error('KJVS chapters contain no Strong\'s word associations.');

  const headwords = [...associations].map(pair => {
    const [headword, key] = JSON.parse(pair);
    return { headword, key };
  }).sort((a, b) => a.headword < b.headword ? -1 : a.headword > b.headword ? 1 :
    a.key < b.key ? -1 : a.key > b.key ? 1 : 0);

  return {
    bundle: { definitionFormat: DICTIONARY_FORMAT, headwords, definitions },
    chapterCount,
    definitionCount: definitionKeys.length,
    headwordCount: new Set(headwords.map(match => match.headword)).size,
    associationCount: headwords.length,
    missingDefinitionKeys: [...missingDefinitions].sort()
  };
}

/** Repackage the existing gzip inputs; leave both original bundles unchanged. */
export async function buildStrongsDictionaryEditionFile(strongsPath, biblePath, outputPath) {
  if (!outputPath.endsWith('.json.gz')) throw new Error('Output filename must end in .json.gz.');
  if ([strongsPath, biblePath].some(path => resolve(path) === resolve(outputPath))) {
    throw new Error('Refusing to overwrite a source bundle.');
  }
  const strongs = JSON.parse(gunzipSync(await readFile(strongsPath)).toString('utf8'));
  const bible = JSON.parse(gunzipSync(await readFile(biblePath)).toString('utf8'));
  const result = createStrongsDictionaryEdition(strongs, bible);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, gzipSync(JSON.stringify(result.bundle), { level: 9 }));
  return result;
}

async function main() {
  const [strongsPath, biblePath, outputPath, ...extra] = process.argv.slice(2);
  if (!strongsPath || !biblePath || !outputPath || extra.length) {
    throw new Error('Usage: node zarf/scripts/seed/build-strongs-dictionary-edition.mjs <strongs.json.gz> <kjvs.json.gz> <strongs-kjvs.json.gz>');
  }
  const result = await buildStrongsDictionaryEditionFile(strongsPath, biblePath, outputPath);
  console.info(`Wrote ${result.definitionCount} Strong's definitions, ${result.associationCount} associations (${result.headwordCount} unique headwords) from ${result.chapterCount} chapters to ${outputPath}.`);
  if (result.missingDefinitionKeys.length) {
    console.warn(`Skipped Bible associations for ${result.missingDefinitionKeys.length} Strong's IDs absent from the definitions bundle: ${result.missingDefinitionKeys.join(', ')}.`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
