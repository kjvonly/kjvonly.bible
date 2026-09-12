import { notesApi } from '$lib/nostr/events/notes.nostr';
import { bibleLocationReferenceService } from '$lib/domains/bible/services/bibleLocationReference.service';
import {  getBibleDB, SEARCH } from '$lib/domains/bible/persistence/bible.db';
import { sleep } from '$lib/infrastructure/utils/sleep';
import FlexSearch, { type Id } from 'flexsearch';
import type { Note } from '$lib/domains/notes/models/note.model';

let bibleDB = await getBibleDB()

async function waitForSearchIndex(): Promise<boolean> {
  while (1) {
    let searchIndex = await bibleDB.getValue(SEARCH, 'v1');
    if (searchIndex) {
      return true;
    }
    await sleep(1000);
  }
  return false;
}

let notesDocument = new FlexSearch.Document({
  document: {
    id: 'id',
    index: ['title', 'text', 'tags[]:tag', 'bookChapter', 'bibleLocationRef']
  }
});

type IndexedNote = Note & {
  bookChapter?: string;
};

let notes: Record<string, IndexedNote> = {};

async function init() {
  let cachedNotes = await notesApi.gets();
  notes = {};
  for (let i = 0; i < cachedNotes.length; i++) {
    const note = createIndexedNote(cachedNotes[i]);
    await notesDocument.addAsync(note.id, note);
    notes[note.id] = note;
  }

  getAllNotes('*');
}

function createIndexedNote(note: Note): IndexedNote {
  if (!note.bibleLocationRef) {
    return { ...note };
  }

  return {
    ...note,
    bookChapter: bibleLocationReferenceService.extractBookIDChapter(
      note.bibleLocationRef
    )
  };
}

function addNote(noteID: string, note: Note) {
  const indexedNote = createIndexedNote(note);
  notes[noteID] = indexedNote;
  notesDocument.add(noteID, indexedNote);
  getAllNotes('*');
}

function deleteNote(noteID: string) {
  delete notes[noteID];
  notesDocument.remove(noteID);
  getAllNotes('*');
}

async function searchNotes(id: string, searchTerm: string, indexes: string[]) {
  const results = await notesDocument.searchAsync(searchTerm, {
    index: indexes
  });

  let filteredNotes: any = {};
  results.forEach((r) => {
    r.result.forEach((id) => {
      filteredNotes[id] = notes[id];
    });
  });
  if (Object.keys(filteredNotes).length > 0) {
    postMessage({ id: id, notes: filteredNotes });
  }
}

function getAllNotes(id: string) {
  postMessage({ id: id, notes: notes });
}

onmessage = async (e) => {
  switch (e.data.action) {
    case 'init':
      await init();
      break;
    case 'addNote':
      addNote(e.data.noteID, e.data.note);
      break;
    case 'deleteNote':
      deleteNote(e.data.noteID);
      break;
    case 'searchNotes':
      await searchNotes(e.data.id, e.data.text, e.data.indexes);
      break;
    case 'getAllNotes':
      getAllNotes(e.data.id);
  }
};

init();
