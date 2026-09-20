import uuid4 from 'uuid4';
import { Modules } from '$lib/application/models/modules.model';

import type {
	ResourceSelections
} from '$lib/application/resources/resource-selections';

import type {
	BufferBag
} from './buffer-bag.model';

export class Buffer {
	// Buffer identity is independent from Pane identity and survives Workspace persistence.
	key: string = uuid4();
	componentName: Modules = Modules.NULL;
	bag: BufferBag = {}; // persisted navigation context

	resourceSelections:
		ResourceSelections;

	constructor(
		resourceSelections:
			ResourceSelections =
			{}
	) {
		this.resourceSelections =
			resourceSelections;
	}
}
