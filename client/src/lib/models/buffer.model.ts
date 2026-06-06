import uuid4 from 'uuid4';
import { Modules } from './modules.model';

export class Buffer {
	key: string = uuid4();
	name: string = '';
	component: any;
	componentName: Modules = Modules.NULL;
	keyboardBindings: Map<string, Function> = new Map<string, Function>();
	selected: boolean = false;
	bag: any = {}; // for persistence
	onFocus: Function = () => {};
}

export class NullBuffer extends Buffer {
	componentName: Modules = Modules.NULL;
}

class AddBufferError extends Error {}

class bufferService {
	currentBuffer: Buffer = new NullBuffer();

	constructor() {}

	updateComponent(component: any) {
		this.currentBuffer.component = component;
	}
}

export let BufferService = new bufferService();
