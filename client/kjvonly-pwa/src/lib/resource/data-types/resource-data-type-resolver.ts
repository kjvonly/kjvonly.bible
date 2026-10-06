import type {
	ResourceDataTypeHandler
} from './resource-data-type-handler';

/** Resolves one exact semantic Resource payload contract. */
export class ResourceDataTypeResolver {
	private readonly handlers =
		new Map<
			string,
			ResourceDataTypeHandler
		>();

	constructor(
		handlers:
			readonly ResourceDataTypeHandler[]
	) {
		for (
			const handler of handlers
		) {
			const key =
				createDataTypeKey(
					handler.dataType,
					handler.dataVersion
				);

			if (
				this.handlers.has(
					key
				)
			) {
				throw new Error(
					`Duplicate Resource data type handler: ${handler.dataType}@${handler.dataVersion}`
				);
			}

			this.handlers.set(
				key,
				handler
			);
		}
	}

	resolve(
		dataType: string,
		dataVersion: number
	): ResourceDataTypeHandler {
		const handler =
			this.handlers.get(
				createDataTypeKey(
					dataType,
					dataVersion
				)
			);

		if (
			handler === undefined
		) {
			throw new Error(
				`Unsupported Resource data type: ${dataType}@${dataVersion}`
			);
		}

		return handler;
	}
}

function createDataTypeKey(
	dataType: string,
	dataVersion: number
): string {
	return `${dataType}@${dataVersion}`;
}
