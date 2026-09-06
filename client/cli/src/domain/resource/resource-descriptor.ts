export interface ResourceDescriptor {
	readonly metadata:
		ResourceDescriptorMetadata;

	readonly strategy:
		ResourceDescriptorStrategy;
}


export interface ResourceDescriptorMetadata {
	readonly publisher:
		string;

	readonly resourceId:
		string;

	readonly category:
		string;

	readonly modifiedAt:
		number;

	readonly mediaType:
		string;
}


export interface ResourceDescriptorStrategy {
	readonly type:
		string;

	readonly data:
		unknown;
}