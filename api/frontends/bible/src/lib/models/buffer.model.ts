import uuid4 from "uuid4";


export class Buffer {
	key: string = uuid4();
	name: string = '';
	component: any;
	componentName: string = '';
	keyboardBindings: Map<string, Function> = new Map<string, Function>();
	selected: boolean = false;
	bag: any = {}; // for persistence
	onFocus: Function = () => {};
}

export class NullBuffer extends Buffer {
	componentName: string = 'NullBuffer';
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
