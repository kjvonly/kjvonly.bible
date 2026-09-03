const notesWorker = new Worker(
  new URL('../workers/kjvnotes.worker?worker', import.meta.url),
  {
    type: 'module'
  }
);

// TODO this needs to call into notes.api/notes.nostr

/**
 * Note the * character is wildcard for get all notes. Will change in the future.
 */
class NotesService {
  unsubscribe(subID: any) {
    let tmpSubscribers: any = [];
    this.subscribers.forEach((s) => {
      if (s.subID !== subID) {
        tmpSubscribers.push();
      }
    });
    this.subscribers = tmpSubscribers;
  }

  subscribers: any[] = [];
  constructor() {
    notesWorker.onmessage = (e) => {
      this.subscribers.forEach((s) => {
        if (s.id === e.data.id) {
          s.fn(e.data);
        }
      });
    };
  }

  subscribe(subID: string, id: any, fn: any) {
    this.subscribers.push({ subID: subID, id: id, fn: fn });
  }

  searchNotes(id: string, text: string, indexes: string[]) {
    notesWorker.postMessage({
      action: 'searchNotes',
      id: id,
      text: text,
      indexes: indexes
    });
  }

  getAllNotes(id: string) {
    notesWorker.postMessage({ action: 'getAllNotes', id: id });
  }

  deleteNote(id: string, noteID: string) {
    notesWorker.postMessage({ action: 'deleteNote', noteID: noteID });
  }

  addNote(id: string, noteID: string, note: any) {
    notesWorker.postMessage({ action: 'addNote', noteID: noteID, note: note });
  }

  init() {
    notesWorker.postMessage({ action: 'init' });
  }
}

export const notesService = new NotesService();
