export interface PlanSubscriptionIdParts {
	readonly publisher: string;
	readonly group: string;
	readonly subscriptionId: string;
}

export function createPlanSubscriptionId(
	publisher: string,
	group: string,
	subscriptionId: string
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
		'subscription id',
		subscriptionId
	);

	return `${publisher}/${group}/${subscriptionId}`;
}

export function parsePlanSubscriptionId(
	id: string
): PlanSubscriptionIdParts {
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
			`Invalid Plan Subscription id: ${id}`
		);
	}

	const [
		publisher,
		group,
		subscriptionId
	] = parts;

	return {
		publisher,
		group,
		subscriptionId
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
			`Invalid Plan Subscription ${label}: ${value}`
		);
	}
}
