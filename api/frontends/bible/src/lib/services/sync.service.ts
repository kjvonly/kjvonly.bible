
export class SyncService {
    worker = new Worker(new URL('../workers/kjvsync.worker?worker', import.meta.url), {
			type: 'module'
		});
    
    //todo unsubscribe
    subscribers: any[] = []

    constructor() {
        this.worker.onmessage = (e) => {
            this.subscribers.forEach((s) => {
                if (s.id === e.data.id) {
                    s.fn(e.data)
                }
            })
        }

        let token = localStorage.getItem('token')
        this.worker.postMessage({ action: 'init', token: token })
    }

    subscribe(id: any, fn: any) {
        this.subscribers.push({ id: id, fn: fn })
    }

    sync(){
        let token = localStorage.getItem('token')
        this.worker.postMessage({
					action: 'sync',
					token: token
				}
            )
    }
    
}

export let syncService = new SyncService() 