export interface ResourceContentDecorator {
	encode(
		value: unknown
	): Promise<unknown>;

	decode(
		value: unknown
	): Promise<unknown>;
}