import type {
	ResourceInstallation
} from '$lib/resource';

export interface KJVOnlyArchiveExportSelection {
	readonly types:
		readonly KJVOnlyArchiveExportTypeSelection[];
}

export interface KJVOnlyArchiveExportTypeSelection {
	readonly objectType:
		string;

	readonly patterns?:
		readonly string[];
}

export function parseKJVOnlyArchiveExportPatterns(
	value: string
): readonly string[] {
	return [
		...new Set(
			value
				.split(',')
				.map(
					(pattern) =>
						pattern.trim()
				)
				.filter(Boolean)
		)
	];
}

export function matchesKJVOnlyArchiveExportSelection(
	installation:
		ResourceInstallation,
	selection:
		KJVOnlyArchiveExportSelection
): boolean {
	const typeSelection =
		selection.types.find(
			(candidate) =>
				candidate.objectType ===
				installation.objectType
		);

	if (!typeSelection) {
		return false;
	}

	return matchesObjectIdPatterns(
		installation.objectId,
		typeSelection.patterns
	);
}

export function matchesObjectIdPatterns(
	objectId: string,
	patterns:
		readonly string[] |
		undefined
): boolean {
	const normalizedPatterns =
		patterns
			?.map(
				(pattern) =>
					pattern.trim()
			)
			.filter(Boolean) ??
		[];

	if (
		normalizedPatterns.length === 0 ||
		normalizedPatterns.includes('*')
	) {
		return true;
	}

	const [, ...segments] =
		objectId.split('/');

	const tail =
		segments.join('/');

	return normalizedPatterns.some(
		(pattern) =>
			compileGlob(
				pattern
			).test(
				tail
			)
	);
}

function compileGlob(
	pattern: string
): RegExp {
	const escaped =
		pattern
			.split('*')
			.map(escapeRegExp)
			.join('.*');

	return new RegExp(
		`^${escaped}$`
	);
}

function escapeRegExp(
	value: string
): string {
	return value.replace(
		/[.*+?^${}()|[\]\\]/g,
		'\\$&'
	);
}
