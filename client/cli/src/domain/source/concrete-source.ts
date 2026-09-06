import type {
	EventDefinition,
	ObjectUploadDefinition
} from './manifest.js';


export interface ConcreteSource {
	readonly resourceName:
		string;

	readonly key:
		string;

	readonly path:
		string;

	readonly event:
		EventDefinition;

	readonly objectUpload?:
		ObjectUploadDefinition;
}