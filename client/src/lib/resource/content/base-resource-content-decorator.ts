import type {
	ResourceContentDecorator
} from './resource-content-decorator';

export class BaseResourceContentDecorator
	implements ResourceContentDecorator {

	async encode(
		value: unknown
	): Promise<unknown> {
		return value;
	}

	async decode(
		value: unknown
	): Promise<unknown> {
		return value;
	}
}