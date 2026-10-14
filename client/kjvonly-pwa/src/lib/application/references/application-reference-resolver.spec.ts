import {
	describe,
	expect,
	it
} from 'vitest';

import {
	Modules
} from '../models/modules.model';

import {
	BIBLE_LOCATION_REFERENCE_TYPE,
	parseBibleLocationRef
} from '$lib/domains/bible';

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

	it('validates Bible references using the existing registered type', () => {
		const resolver = new ApplicationReferenceResolver([
			{
				referenceType: BIBLE_LOCATION_REFERENCE_TYPE,
				module: Modules.BIBLE,
				view: 'bible.reader',
				createState: (value) => {
					const bibleLocationRef = parseBibleLocationRef(value);
					return bibleLocationRef === undefined
						? undefined
						: { bibleLocationRef };
				}
			}
		]);

		expect(resolver.resolve('bibleLocationReference:1_1_1')).toEqual({
			module: Modules.BIBLE,
			view: 'bible.reader',
			state: { bibleLocationRef: '1_1_1' }
		});
		expect(resolver.resolve('bibleLocationReference:1_1_10-15')?.state)
			.toEqual({ bibleLocationRef: '1_1_10-15' });
		expect(resolver.resolve('bibleLocationReference:23_119_130-132')?.state)
			.toEqual({ bibleLocationRef: '23_119_130-132' });
		expect(resolver.resolve('bibleLocationReference:1_1_1_0')?.state)
			.toEqual({ bibleLocationRef: '1_1_1_0' });
		expect(resolver.resolve('bibleLocationReference:43_3_16')?.state)
			.toEqual({ bibleLocationRef: '43_3_16' });
		expect(resolver.resolve('bibleLocationReference:1_1_10-32'))
			.toBeUndefined();
		expect(resolver.resolve('bibleLocationReference:1_1_15-10'))
			.toBeUndefined();
		expect(resolver.resolve('bibleLocationReference:1_1_99'))
			.toBeUndefined();
		expect(resolver.resolve('bibleLocationReference:18_1'))
			.toBeUndefined();
		expect(resolver.resolve('bibleLocationReference:1/1/1'))
			.toBeUndefined();
		expect(resolver.resolve('biblelocationref:1_1_1'))
			.toBeUndefined();
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
