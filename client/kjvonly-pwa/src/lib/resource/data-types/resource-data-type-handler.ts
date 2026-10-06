/**
 * Understands one versioned semantic Resource payload contract.
 */
export interface ResourceDataTypeHandler<
	TValue = unknown
> {
	readonly dataType:
		string;

	readonly dataVersion:
		number;

	validate(
		value: unknown
	): TValue;
}
