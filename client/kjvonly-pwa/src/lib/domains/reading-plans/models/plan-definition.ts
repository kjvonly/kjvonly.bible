/**
 * Accepted application-facing Reading Plan definition.
 *
 * Publisher/group/key identity is represented by `id`; transport-only
 * Resource metadata does not become Plan Definition content.
 */
export interface PlanDefinition {
	readonly id:
		string;

	readonly name:
		string;

	readonly description:
		string;

	readonly encodedReadings:
		readonly string[];
}
