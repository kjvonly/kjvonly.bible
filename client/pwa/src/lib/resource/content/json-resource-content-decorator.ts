import type { ResourceContentDecorator } from './resource-content-decorator';

export class JsonResourceContentDecorator implements ResourceContentDecorator {
	constructor(
		private readonly inner: ResourceContentDecorator
	) {}

	async encode(value: unknown): Promise<unknown> {
		const innerValue = await this.inner.encode(value);

		const serialized = JSON.stringify(innerValue);

		if (serialized === undefined) {
			throw new Error(
				'Resource content cannot be serialized as JSON.'
			);
		}

		return serialized;
	}

	async decode(value: unknown): Promise<unknown> {
		let serialized: string;

		if (typeof value === 'string') {
			serialized = value;
		} else if (value instanceof Uint8Array) {
			serialized = new TextDecoder().decode(value);
		} else {
			throw new Error(
				'JSON Resource content must be a string or Uint8Array.'
			);
		}

		const decoded = JSON.parse(serialized) as unknown;

		return this.inner.decode(decoded);
	}
}