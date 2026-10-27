export interface PlanDefinitionIdParts {
	readonly publisher:
		string;

	readonly group:
		string;

	readonly planKey:
		string;
}

export function createPlanDefinitionId(
	publisher: string,
	group: string,
	planKey: string
): string {
	validateSegment(
		'publisher',
		publisher
	);
	validateSegment(
		'group',
		group
	);
	validateSegment(
		'plan key',
		planKey
	);

	return `${publisher}/${group}/${planKey}`;
}

export function parsePlanDefinitionId(
	id: string
): PlanDefinitionIdParts {
	const parts =
		id.split('/');

	if (
		parts.length !== 3 ||
		parts.some(
			(part) =>
				part.length === 0
		)
	) {
		throw new Error(
			`Invalid Plan Definition id: ${id}`
		);
	}

	const [
		publisher,
		group,
		planKey
	] = parts;

	return {
		publisher,
		group,
		planKey
	};
}

function validateSegment(
	label: string,
	value: string
): void {
	if (
		value.length === 0 ||
		value.includes('/')
	) {
		throw new Error(
			`Invalid Plan Definition ${label}: ${value}`
		);
	}
}
