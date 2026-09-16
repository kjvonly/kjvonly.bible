import type { PaneSplit } from './pane-split';

export interface Pane {
	id: string | any;
	left: Pane | any;
	right: Pane | any;
	split: PaneSplit | undefined;
	buffer: any;
	updateBuffer: Function | any;
	toggle: boolean | any;
}
