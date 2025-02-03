import type { node } from "./dynamicGrid";


export class PaneService {
    private static _instance: PaneService;
    rootPane: node = {
        id: 'a',
        split: undefined,
        left: undefined,
        right: undefined,

    };


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

    save(){
        
    }
    onDeletePane: Function = () => { }
    onSplitPane: Function = () => { }
    

    private constructor() {

    }

    public static get Instance() {
        // Do you need arguments? Make it a regular static method instead.
        return this._instance || (this._instance = new this());
    }
}
export let paneService = PaneService.Instance;