import {
	describe,
	expect,
	it
} from 'vitest';

import {
	Modules
} from '../models/modules.model';

import {
	ApplicationReferenceResolver,
	parseApplicationReference
} from './application-reference-resolver';

describe('ApplicationReferenceResolver', () => {
	it('resolves a registered reference type without interpreting its value', () => {
		const resolver =
			new ApplicationReferenceResolver([
				{
					referenceType:
						'bibleLocationReference',
					module:
						Modules.BIBLE,
					view:
						'bible.reader',
					createState:
						(value) => ({
							bibleLocationRef:
								value
						})
				}
			]);

		expect(
			resolver.resolve(
				'bibleLocationReference:43_3_16'
			)
		).toEqual({
			module: Modules.BIBLE,
			view: 'bible.reader',
			state: {
				bibleLocationRef:
					'43_3_16'
			}
		});
	});

	it('preserves additional delimiters inside the consumer-owned value', () => {
		expect(
			parseApplicationReference(
				'normalizedDocumentReference:document:part#block'
			)
		).toEqual({
			referenceType:
				'normalizedDocumentReference',
			value:
				'document:part#block'
		});
	});

	it.each([
		'#footnote',
		'',
		':missing-type',
		'missing-value:'
	])(
		'does not parse malformed or native reference %s',
		(reference) => {
			expect(
				parseApplicationReference(
					reference
				)
			).toBeUndefined();
		}
	);

	it('returns undefined for an unregistered reference type', () => {
		const resolver =
			new ApplicationReferenceResolver([]);

		expect(
			resolver.resolve(
				'https://example.com'
			)
		).toBeUndefined();
	});

	it('rejects duplicate reference consumer registrations', () => {
		expect(
			() =>
				new ApplicationReferenceResolver([
					registration(),
					registration()
				])
		).toThrow(
			'Application reference consumer already registered: testReference'
		);
	});
});

function registration() {
	return {
		referenceType:
			'testReference',
		module:
			Modules.NULL,
		view:
			'test.view',
		createState:
			(value: string) => ({
				value
			})
	};
}
