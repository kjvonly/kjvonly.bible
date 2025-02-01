import { Buffer, NullBuffer } from './buffer.model';


export class Pane {
	id: string = crypto.randomUUID();
	parentNode: Pane | null = null;
	leftPane: Pane | null = $state(null);
	rightPane: Pane | null = $state(null);
	buffer: Buffer = new NullBuffer();
	split: PaneSplit = PaneSplit.Null;
	leftPercentage: string = '50%';
	rightPercentage: string = '50%';
}

export class PaneJson {
	id: string = crypto.randomUUID();
	parentNodeId = '';
	buffer: Buffer = new NullBuffer();
	split: PaneSplit = PaneSplit.Null;
	leftPane: PaneJson | null = null;
	rightPane: PaneJson | null = null;
	leftPercentage: string = '50%';
	rightPercentage: string = '50%';
}

export enum PaneSplit {
	Vertical,
	Horizontal,
	Null
}

export class NullPane extends Pane {}
