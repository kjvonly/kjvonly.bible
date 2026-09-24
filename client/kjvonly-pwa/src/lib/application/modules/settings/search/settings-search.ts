import type {
	SettingsDefinition,
	SettingsRowDefinition
} from '../models/settings-definition.model';
import type {
	SettingsSearchEntry
} from './settings-search.model';

///////////////////////////////////////////////////////////////////////////////

export function createSettingsSearchEntries(
	definition: SettingsDefinition
): SettingsSearchEntry[] {
	const entries: SettingsSearchEntry[] = [];

	for (const page of definition.pages) {
		for (const section of page.sections) {
			for (const row of section.rows) {
				if (row.search?.hidden) {
					continue;
				}

				const secondary = getStaticSecondary(row);

				entries.push({
					pageID: page.id,
					rowID: row.id,
					title: row.title,
					secondary,
					pageTitle: page.title,
					sectionLabel: section.label,
					searchableText: normalizeSearchText([
						row.title,
						secondary,
						...(row.search?.keywords ?? []),
						...getRowContent(row),
						section.label,
						page.title
					])
				});
			}
		}
	}

	return entries;
}

export function searchSettings(
	entries: readonly SettingsSearchEntry[],
	query: string
): SettingsSearchEntry[] {
	const normalizedQuery = normalizeSearchText([
		query
	]);

	if (!normalizedQuery) {
		return [];
	}

	const tokens = normalizedQuery.split(' ');

	return entries.filter(
		(entry) => tokens.every(
			(token) => entry.searchableText.includes(token)
		)
	);
}

///////////////////////////////////////////////////////////////////////////////

function getStaticSecondary(
	row: SettingsRowDefinition
): string | undefined {
	return typeof row.secondary === 'string'
		? row.secondary
		: undefined;
}

function getRowContent(
	row: SettingsRowDefinition
): string[] {
	if (row.type !== 'select') {
		return [];
	}

	return row.options.flatMap(
		(option) => [
			option.label,
			option.secondary
		].filter(
			(value): value is string => typeof value === 'string'
		)
	);
}

function normalizeSearchText(
	values: readonly (string | undefined)[]
): string {
	return values
		.filter(
			(value): value is string => typeof value === 'string'
		)
		.join(' ')
		.toLocaleLowerCase()
		.replace(/\s+/g, ' ')
		.trim();
}
