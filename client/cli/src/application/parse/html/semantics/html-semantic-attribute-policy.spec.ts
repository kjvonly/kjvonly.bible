import type {
	Element
} from 'domhandler';

import {
	describe,
	expect,
	it
} from 'vitest';

import {
	getUnsupportedHtmlSemanticAttributes
} from './html-semantic-attribute-policy.js';

describe(
	'getUnsupportedHtmlSemanticAttributes',
	() => {
		it(
			'reports every unconsumed attribute on a supported element',
			() => {
				expect(
					getUnsupportedHtmlSemanticAttributes(
						element(
							'ol',
							{
								type:
									'I',
								start:
									'4',
								reversed:
									''
							}
						)
					)
				).toEqual([
					{
						name:
							'reversed',
						value:
							''
					},
					{
						name:
							'start',
						value:
							'4'
					},
					{
						name:
							'type',
						value:
							'I'
					}
				]);
			}
		);

		it(
			'allows attributes consumed by existing normalization concerns',
			() => {
				expect(
					getUnsupportedHtmlSemanticAttributes(
						element(
							'a',
							{
								href:
									'/kjv/1_1_1',
								id:
									'verse-link',
								class:
									'text-center',
								style:
									'text-align: center',
								'data-source':
									'kjv'
							}
						)
					)
				).toEqual([]);
			}
		);

		it(
			'reports global semantics that are not represented by v1',
			() => {
				expect(
					getUnsupportedHtmlSemanticAttributes(
						element(
							'p',
							{
								lang:
									'he',
								dir:
									'rtl',
								'aria-label':
									'Hebrew text'
							}
						)
					)
				).toEqual([
					{
						name:
							'aria-label',
						value:
							'Hebrew text'
					},
					{
						name:
							'dir',
						value:
							'rtl'
					},
					{
						name:
							'lang',
						value:
							'he'
					}
				]);
			}
		);
	}
);

function element(
	name: string,
	attribs: Record<string, string>
): Element {
	return {
		name,
		attribs
	} as Element;
}
