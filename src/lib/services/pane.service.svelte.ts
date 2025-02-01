
import { Buffer, NullBuffer } from '$lib/models/buffer.model';
import { NullPane, Pane, PaneJson, PaneSplit } from '$lib/models/pane.model.svelte';
import { componentMapping } from '$lib/services/component-mapping.service';


export class PaneService {
	private static _instance: PaneService;
	rootPane: Pane = $state(new Pane());

	onUpdate: Function = () => { }

	private constructor() {

		let ps = localStorage.getItem('pane');

		if (ps !== null) {
			let pane = new Pane();
			fromJson(JSON.parse(ps), pane);
			this.rootPane = pane
		} else {

			this.rootPane = new Pane();
			this.rootPane.buffer = new Buffer();
			this.rootPane.buffer.componentName = 'ChapterContainer';
			//this.rootPane.buffer.component = componentMapping.getComponent('ChapterContainer');
			this.rootPane.split = PaneSplit.Null;
		}
	}

	public static get Instance() {
		// Do you need arguments? Make it a regular static method instead.
		return this._instance || (this._instance = new this());
	}

	findBufferPane(key: string, pane: Pane | null): Pane {
		if (!pane || pane instanceof NullPane) {
			return new NullPane();
		}

		if (pane.split === PaneSplit.Null && pane.buffer.key === key) {
			return pane;
		}

		// recurse left panes
		let newPane = this.findBufferPane(key, pane.leftPane);

		if (!(newPane instanceof NullPane)) {
			return newPane;
		}

		// recurse right panes
		newPane = this.findBufferPane(key, pane.rightPane);

		if (!(newPane instanceof NullPane)) {
			return newPane;
		}

		return new NullPane();
	}

	findPane(id: string, pane: Pane | null): Pane {

		if (!pane || pane instanceof NullPane) {
			return new NullPane();
		}

		if (pane.split === PaneSplit.Null && pane.id === id) {
			return pane;
		}

		// recurse left panes
		let newPane = this.findPane(id, pane.leftPane);

		if (!(newPane instanceof NullPane)) {
			return newPane;
		}

		// recurse right panes
		newPane = this.findPane(id, pane.rightPane);

		if (!(newPane instanceof NullPane)) {
			return newPane;
		}

		return new NullPane();
	}

	splitPane(id: string, paneSplit: PaneSplit, componentName: any, bag: any = {}) {
		let p = this.findPane(id, this.rootPane)

		p.split = paneSplit;

		p.leftPane = new Pane();
		p.leftPane.buffer = p.buffer;
		p.leftPane.parentNode = p;
		p.leftPane.split = PaneSplit.Null;

		p.rightPane = new Pane();
		p.rightPane.buffer = new Buffer();
		p.rightPane.buffer.bag = bag;
		p.rightPane.buffer.componentName = componentName;
		p.rightPane.buffer.component = componentMapping.getComponent(componentName);
		p.rightPane.parentNode = p;
		p.rightPane.split = PaneSplit.Null;

		p.buffer = new NullBuffer();


		this.onUpdate(this.rootPane)
	}

	deletePane(id: string) {
		let cp = this.findPane(id, this.rootPane)
		if (cp.id === this.rootPane.id) {
			cp.buffer = new NullBuffer();
		}

		let pn = cp.parentNode;
		let ppn = pn?.parentNode;

		let paneToReplaceParentPane: Pane | null = null;
		if (pn?.leftPane?.id === cp.id) {
			paneToReplaceParentPane = pn?.rightPane;
		}

		if (pn?.rightPane?.id === cp.id) {
			paneToReplaceParentPane = pn?.leftPane;
		}

		if (ppn && ppn.leftPane && ppn.leftPane.id === pn?.id) {
			ppn.leftPane = paneToReplaceParentPane;

			if (ppn.leftPane) {
				ppn.leftPane.parentNode = ppn;
			}
		}

		if (ppn && ppn.rightPane && ppn.rightPane.id === pn?.id) {
			ppn.rightPane = paneToReplaceParentPane;

			if (ppn.rightPane) {
				ppn.rightPane.parentNode = ppn;
			}
		}

		// if ppn is null pn must be the root pane
		if (ppn === null) {
			if (paneToReplaceParentPane?.buffer) {
				this.rootPane = paneToReplaceParentPane;
				this.rootPane.parentNode = null;
				if (this.rootPane.leftPane) {
					// currentBuffer.set(this.rootPane.leftPane.buffer);
				} else if (this.rootPane.rightPane) {
					// currentBuffer.set(this.rootPane.rightPane.buffer);
				} else {
					// currentBuffer.set(this.rootPane.buffer);
				}
			}
		}

		this.onUpdate(this.rootPane)
	}

	save() {
		let p2j = new PaneJson();
		toJson(this.rootPane, p2j);
		localStorage.setItem('pane', JSON.stringify(p2j));
	}
}


function toJson(pane: Pane, p2j: PaneJson) {
	if (pane.leftPane) {
		p2j.leftPane = new PaneJson();
		toJson(pane.leftPane, p2j.leftPane);
	}

	if (pane.rightPane) {
		p2j.rightPane = new PaneJson();
		toJson(pane.rightPane, p2j.rightPane);
	}

	p2j.id = pane.id;
	p2j.leftPercentage = pane.leftPercentage;
	p2j.rightPercentage = pane.rightPercentage;
	p2j.buffer = pane.buffer;
	p2j.parentNodeId = pane.parentNode?.id || '';
	p2j.split = pane.split;
}

function fromJson(p2j: PaneJson, pane: Pane) {
	if (p2j.leftPane !== null) {
		let lp = new Pane();

		lp.parentNode = pane;
		pane.leftPane = lp;
		fromJson(p2j.leftPane, pane.leftPane);
	}

	if (p2j.rightPane !== null) {
		let rp = new Pane();
		rp.parentNode = pane;
		pane.rightPane = rp;
		fromJson(p2j.rightPane, pane.rightPane);
	}

	pane.id = p2j.id;
	pane.leftPercentage = p2j.leftPercentage;
	pane.rightPercentage = p2j.rightPercentage;
	pane.buffer = p2j.buffer;
	pane.split = p2j.split;
}

export let paneService = PaneService.Instance;

