import { NOTES, UNSYNCED_NOTES } from "$lib/storer/bible.db"
import { bibleStorer } from "$lib/storer/bible.storer"
import { offlineApi } from "./offline.api"

export class NotesApi {
    async putNote(data: any): Promise<any> {
        let path = '/notes'
        let unsyncedDB = UNSYNCED_NOTES
        let syncedDB = NOTES
        return offlineApi.put(data, path, unsyncedDB, syncedDB)
    }

    async getAllNotes(): Promise<any> {
        let data: any = undefined
        try {
            data = await bibleStorer.getAllValue(NOTES)
        } catch (error) {
            console.log(`error getting all annotations from indexedDB: ${error}`)
        }
        return data
    }

    async deleteNote(noteID: string): Promise<any> {
        let path: string = `/notes`
        let delNte = {
            id: noteID,
            dateDeleted: Date.now()
        }
        await offlineApi.delete(delNte, path, UNSYNCED_NOTES, NOTES)
    }
}

export let notesApi = new NotesApi()