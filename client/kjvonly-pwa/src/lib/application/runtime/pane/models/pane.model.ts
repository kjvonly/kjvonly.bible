import type {
	Buffer
} from '$lib/application/runtime/buffer/models/buffer.model';

import type {
	PaneSplit
} from './pane-split';

export interface Pane {
	id: string | undefined;
	left: Pane | undefined;
	right: Pane | undefined;
	split: PaneSplit | undefined;
	buffer: Buffer | undefined;
	toggle?: boolean;
}
