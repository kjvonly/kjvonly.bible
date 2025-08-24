class SearchService {
    webWorker = new Worker(new URL('../workers/kjvsearch.worker?worker', import.meta.url), {
        type: 'module'
    });

    // TODO: unsubscribe

    subscribers: any[] = []
    constructor() {
        this.webWorker.onmessage = (e) => {
            this.subscribers.forEach((s) => {
                if (s.id === e.data.id) {
                    s.fn(e.data)
                }
            })
        }

        this.webWorker.postMessage({ action: 'init' })
    }

    subscribe(id: any, fn: any) {
        this.subscribers.push({ id: id, fn: fn })
    }

    search(id: string, text: string) {
        this.webWorker.postMessage({ action: 'search', id: id, text: text })
    }


    searchNotes(id: string, text: string, indexes: string[]) {
        this.webWorker.postMessage({ action: 'searchNotes', id: id, text: text, indexes: indexes })
    }

    getAllNotes(id: string) {
        this.webWorker.postMessage({ action: 'getAllNotes', id: id})
    }

    deleteNote(id:string, noteID: string){
        this.webWorker.postMessage({ action: 'deleteNote', noteID: noteID})
    }

    addNote(id: string, noteID:string, note: any){
        this.webWorker.postMessage({ action: 'addNote', noteID: noteID, note: note})
    }

    initNotes(){
        this.webWorker.postMessage({ action: 'initNotes'})
    }  
}

export const searchService = new SearchService()




