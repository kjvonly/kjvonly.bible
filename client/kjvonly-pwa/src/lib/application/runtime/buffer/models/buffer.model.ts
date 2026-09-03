import uuid4 from 'uuid4';
import { Modules } from '$lib/application/models/modules.model';

import type {
	ResourceSelections
} from '$lib/application/resources/resource-selections';

export class Buffer {
	key: string = uuid4();
	name: string = '';
	component: any;
	componentName: Modules = Modules.NULL;
	keyboardBindings: Map<string, Function> = new Map<string, Function>();
	selected: boolean = false;
	bag: any = {}; // for persistence
	onFocus: Function = () => { };


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

export class NullBuffer extends Buffer {
	componentName: Modules = Modules.NULL;
}

class AddBufferError extends Error { }

class bufferService {
	currentBuffer: Buffer = new NullBuffer();

	constructor() { }

	updateComponent(component: any) {
		this.currentBuffer.component = component;
	}
}

export let BufferService = new bufferService();
