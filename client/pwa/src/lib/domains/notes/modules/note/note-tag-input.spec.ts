import { describe, expect, it } from 'vitest';
import { parseNoteTagInput } from './note-tag-input';

describe('parseNoteTagInput', () => {
	it('trims comma-separated tags and removes blank entries', () => {
		expect(
			parseNoteTagInput(' prayer, grace, , faith ')
		).toEqual([
			'prayer',
			'grace',
			'faith'
		]);
	});

	it('returns no tags for empty input', () => {
		expect(parseNoteTagInput('   ')).toEqual([]);
	});
});
