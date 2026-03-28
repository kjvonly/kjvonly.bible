import { NOTES, UNSYNCED_NOTES } from '$lib/storer/bible.db';
import { bibleStorer } from '$lib/storer/bible.storer';
import type { NostrEvent } from 'nostr-tools';
import { offlineApi } from './offline.nostr';
import { NOTES_KIND } from './kinds';
import { KJVONLY_PUBKEY } from '$lib/utils/nostr';

export class NotesApi {

  async put(data: any): Promise<any> {
    let unsyncedDB = UNSYNCED_NOTES;
    let syncedDB = NOTES;
    let event: NostrEvent = {
      kind: NOTES_KIND,
      tags: [
        ["d", `kjvonly/notes/default/${data.id}`]
      ],
      content: '',
      created_at: 0,
      pubkey: '',
      id: '',
      sig: ''
    }
    return await offlineApi.put(event, data, unsyncedDB, syncedDB);
  }

  async gets(): Promise<any> {
    let data: any = undefined;
    try {
      let unsyncedNotes = await bibleStorer.getAllValue(UNSYNCED_NOTES);
      let syncedNotes = await bibleStorer.getAllValue(NOTES);

      let concatNotes: any = new Map();
      syncedNotes.forEach((p: any) => {
        concatNotes.set(p.id, p);
      });

      unsyncedNotes.forEach((p: any) => {
        concatNotes.set(p.id, p);
      });

      data = Array.from(concatNotes.values());
    } catch (error) {
      console.log(`error getting all notes from indexedDB: ${error}`);
    }
    return data;
  }

  async delete(id: string): Promise<any> {
    let filter = {
      "#d": [`kjvonly/notes/default/${id}`]
    }

    await offlineApi.delete(id, filter, NOTES_KIND, UNSYNCED_NOTES, NOTES);
  }
}

export let notesApi = new NotesApi();
