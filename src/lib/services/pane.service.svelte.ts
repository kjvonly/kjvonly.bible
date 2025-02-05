import type { node } from "../components/dynamic-grid-template-areas/dynamicGrid";


export class PaneService {
    private static _instance: PaneService;
    rootPane: node = {
        id: 'a',
        split: undefined,
        left: undefined,
        right: undefined,

    };

    hw: any = {}

    findNode(n: node, key: string): node | undefined {
        if (n.id === key) {
            return n;
        }
        let found;

        if (n.left) {
            found = this.findNode(n.left, key);
        }

        if (found) {
            return found;
        }

        if (n.right) {
            found = this.findNode(n.right, key);
        }

        return found;
    }

    save() {
		localStorage.setItem('pane', JSON.stringify(this.rootPane));
	}
    
    onDeletePane: Function = () => { }
    onSplitPane: Function = () => { }

    subscribers: any = []

    subscribe(id: string, fn: Function) {
        this.subscribers.push({ id: id, fn: fn })
    }

    unsubscribe(id: string) {
        this.subscribers = this.subscribers.filter((s: any) => {
            if (s.id !== id) {
                return s
            }


        })
    }


    publishHw(hw: any) {
        this.subscribers.forEach(s => {
            s.fn(hw)
        });
    }

    private constructor() {

    }

    public static get Instance() {
        // Do you need arguments? Make it a regular static method instead.
        return this._instance || (this._instance = new this());
    }
}
export let paneService = PaneService.Instance;