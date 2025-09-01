const searchWorker = new Worker(new URL('../workers/kjvsearch.worker?worker', import.meta.url), {
	type: 'module'
});

class SearchService {
	// TODO: unsubscribe
	subscribers: any[] = [];
	constructor() {
		searchWorker.onmessage = (e) => {
			this.subscribers.forEach((s) => {
				if (s.id === e.data.id) {
					s.fn(e.data);
				}
			});
		};
	}

	subscribe(id: any, fn: any) {
		this.subscribers.push({ id: id, fn: fn });
	}

	init() {
		searchWorker.postMessage({ action: 'init' });
	}

	search(id: string, text: string) {
		searchWorker.postMessage({ action: 'search', id: id, text: text });
	}
}

export const searchService = new SearchService();
