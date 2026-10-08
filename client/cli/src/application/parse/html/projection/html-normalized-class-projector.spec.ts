import {
	load
} from 'cheerio';

import type {
	Element
} from 'domhandler';

import {
	describe,
	expect,
	it
} from 'vitest';

import {
	getIgnoredSourceClassNames,
	getUnsupportedSourceStyleDeclarations,
	projectNormalizedClasses
} from './html-normalized-class-projector.js';

describe(
	'projectNormalizedClasses',
	() => {
		it(
			'keeps generic normalized presentation classes and ignores corpus-specific classes',
			() => {
				expect(
					projectNormalizedClasses(
						element(
							'<p class="text-center publisher-only color-blue color-green color-dark-blue color-red-brown quote-text scripSection list-marker list-marker-roman list-marker-arabic blb-tagged small">Text</p>',
							'p'
						)
					)
				).toEqual([
					'text-center'
				]);
			}
		);

		it.each([
			'indent',
			'nowrap',
			'list-roman',
			'list-arabic'
		])(
			'preserves generic normalized presentation class %s',
			(className: string) => {
				expect(
					projectNormalizedClasses(
						element(
							`<p class="${className}">Text</p>`,
							'p'
						)
					)
				).toEqual([
					className
				]);
			}
		);

		it(
			'projects centered source style into the controlled text-center class',
			() => {
				expect(
					projectNormalizedClasses(
						element(
							'<p style="COLOR: red; TEXT-ALIGN : CENTER;">Text</p>',
							'p'
						)
					)
				).toEqual([
					'text-center'
				]);
			}
		);

		it(
			'deduplicates a normalized class contributed by both class and style',
			() => {
				expect(
					projectNormalizedClasses(
						element(
							'<p class="text-center text-center" style="text-align:center">Text</p>',
							'p'
						)
					)
				).toEqual([
					'text-center'
				]);
			}
		);

		it(
			'ignores unknown classes, unsupported declarations, and malformed style declarations',
			() => {
				expect(
					projectNormalizedClasses(
						element(
							'<p class="publisher-only" style="font-weight:bold; malformed; text-align:left">Text</p>',
							'p'
						)
					)
				).toBeUndefined();
			}
		);

		it(
			'reports valid unsupported style declarations using the final value for repeated properties',
			() => {
				expect(
					getUnsupportedSourceStyleDeclarations(
						element(
							'<p style="DISPLAY:none; font-weight:bold; malformed; text-align:left; text-align:center; color:">KJV</p>',
							'p'
						)
					)
				).toEqual([
					{
						property: 'display',
						value: 'none'
					},
					{
						property: 'font-weight',
						value: 'bold'
					}
				]);
			}
		);

		it(
			'reports only discarded source classes for conversion diagnostics',
			() => {
				expect(
					getIgnoredSourceClassNames(
						element(
							'<p class="text-center legacy indent publisher-only">Text</p>',
							'p'
						)
					)
				).toEqual([
					'legacy',
					'publisher-only'
				]);
			}
		);

		it(
			'returns undefined when the element has no normalized presentation',
			() => {
				expect(
					projectNormalizedClasses(
						element(
							'<span>Text</span>',
							'span'
						)
					)
				).toBeUndefined();
			}
		);
	}
);

function element(
	html: string,
	selector: string
): Element {
	const $ =
		load(
			html
		);

	const value =
		$(
			selector
		).get(
			0
		);

	if (!value) {
		throw new Error(
			`Expected element ${selector}.`
		);
	}

	return value;
}
