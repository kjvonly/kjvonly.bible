const searchWorker = new Worker(new URL('../workers/kjvsearch.worker?worker', import.meta.url), {
        type: 'module'
});

/**
 * Note the * character is wildcard for get all notes. Will change in the future.
 */
class SearchService {
    // TODO: unsubscribe
    subscribers: any[] = []
    constructor() {
        searchWorker.onmessage = (e) => {
            this.subscribers.forEach((s) => {
                if (s.id === e.data.id) {
                    s.fn(e.data)
                }
            })
        }
    }

    subscribe(id: any, fn: any) {
        this.subscribers.push({ id: id, fn: fn })
    }

    search(id: string, text: string) {
        searchWorker.postMessage({ action: 'search', id: id, text: text })
    }


    searchNotes(id: string, text: string, indexes: string[]) {
        searchWorker.postMessage({ action: 'searchNotes', id: id, text: text, indexes: indexes })
    }

    getAllNotes(id: string) {
        searchWorker.postMessage({ action: 'getAllNotes', id: id})
    }

    deleteNote(id:string, noteID: string){
        searchWorker.postMessage({ action: 'deleteNote', noteID: noteID})
    }

    addNote(id: string, noteID:string, note: any){
        searchWorker.postMessage({ action: 'addNote', noteID: noteID, note: note})
    }
    
    init(){
        searchWorker.postMessage({ action: 'init'})
    }  

    initNotes(){
        searchWorker.postMessage({ action: 'initNotes'})
    }  
}

export const searchService = new SearchService()




