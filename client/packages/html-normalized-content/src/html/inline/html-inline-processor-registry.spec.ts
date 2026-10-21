import type {
	Element
} from 'domhandler';

import {
	describe,
	expect,
	it
} from 'vitest';

import {
	HtmlInlineProcessorRegistry
} from './html-inline-processor-registry.js';

import {
	MarkInlineProcessor
} from './processors/mark-inline-processor.js';

import {
	LineBreakInlineProcessor
} from './processors/line-break-inline-processor.js';

import {
	createHtmlInlineState
} from './html-inline-state.js';

describe(
	'HtmlInlineProcessorRegistry',
	() => {
		it(
			'recurses through an unregistered element so descendant content survives',
			() => {
				const registry =
					new HtmlInlineProcessorRegistry([]);

				expect(
					registry.process(
						element(
							'time'
						),
						createHtmlInlineState(),
						[]
					)
				).toMatchObject({
					recurse:
						true
				});
			}
		);

		it(
			'reports whether a semantic processor is registered for a tag',
			() => {
				const registry =
					new HtmlInlineProcessorRegistry([
						new MarkInlineProcessor(
							[
								'mark'
							],
							'highlight'
						)
					]);

				expect(
					registry.has(
						'mark'
					)
				).toBe(
					true
				);

				expect(
					registry.has(
						'time'
					)
				).toBe(
					false
				);
			}
		);

		it(
			'exposes whether registered processors preserve projected presentation',
			() => {
				const registry =
					new HtmlInlineProcessorRegistry([
						new MarkInlineProcessor(
							['mark'],
							'highlight'
						),
						new LineBreakInlineProcessor()
					]);

				expect(
					registry.preservesProjectedPresentation(
						'mark'
					)
				).toBe(true);

				expect(
					registry.preservesProjectedPresentation(
						'br'
					)
				).toBe(false);
			}
		);

		it(
			'rejects duplicate tag registrations',
			() => {
				expect(
					() =>
						new HtmlInlineProcessorRegistry([
							new MarkInlineProcessor(
								[
									'span'
								],
								'highlight'
							),
							new MarkInlineProcessor(
								[
									'span'
								],
								'small'
							)
						])
				).toThrow(
					'Duplicate HTML inline processor for <span>.'
				);
			}
		);
	}
);

function element(
	name: string
): Element {
	return {
		name,
		attribs: {}
	} as Element;
}
