const syncWorker = new Worker(new URL('../workers/kjvsync.worker?worker', import.meta.url), {
    type: 'module'
});

export class SyncService {
    //todo unsubscribe
    subscribers: any[] = []

    constructor() {
        syncWorker.onmessage = (e) => {
            this.subscribers.forEach((s) => {
                if (s.id === e.data.id) {
                    s.fn(e.data)
                }
            })
        }

        let token = localStorage.getItem('token')
        syncWorker.postMessage({ action: 'init', token: token })
    }

    subscribe(id: any, fn: any) {
        this.subscribers.push({ id: id, fn: fn })
    }

    sync() {
        let token = localStorage.getItem('token')
        syncWorker.postMessage({
            action: 'sync',
            token: token
        }
        )
    }

}

export let syncService = new SyncService() 