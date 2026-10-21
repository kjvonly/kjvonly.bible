import type {
	Element
} from 'domhandler';

import {
	describe,
	expect,
	it
} from 'vitest';

import {
	HtmlBlockProcessorRegistry
} from './html-block-processor-registry.js';

import type {
	HtmlBlockProcessorContext
} from '../context/html-block-processor-context.js';

import type {
	HtmlBlockProcessor
} from '../processors/html-block-processor.js';

describe(
	'HtmlBlockProcessorRegistry',
	() => {
		it(
			'registers tags and delegates to the matching strategy',
			() => {
				const processor:
					HtmlBlockProcessor = {
						tags: [
							'custom'
						],
						preservesSourceIdentity: true,
						process: () => [
							{
								type:
									'text',
								id:
									'test-text',
								content: []
							}
						]
					};

				const registry =
					new HtmlBlockProcessorRegistry([
						processor
					]);

				expect(
					registry.has(
						'custom'
					)
				).toBe(
					true
				);

				expect(
					registry.process(
						element(
							'custom'
						),
						context()
					)
				).toEqual([
					{
						type:
							'text',
						id:
							'test-text',
						content: []
					}
				]);
			}
		);

		it(
			'reports whether a registered processor preserves source identity',
			() => {
				const registry =
					new HtmlBlockProcessorRegistry([
						{
							tags: [
								'paragraph-like'
							],
							preservesSourceIdentity: true,
							process: () => []
						},
						{
							tags: [
								'flattened-wrapper'
							],
							preservesSourceIdentity: false,
							process: () => []
						}
					]);

				expect(
					registry.preservesSourceIdentity(
						'paragraph-like'
					)
				).toBe(
					true
				);
				expect(
					registry.preservesSourceIdentity(
						'flattened-wrapper'
					)
				).toBe(
					false
				);
				expect(
					registry.preservesSourceIdentity(
						'unknown'
					)
				).toBe(
					false
				);
			}
		);

		it(
			'rejects duplicate tag registrations',
			() => {
				const processor =
					(tag: string): HtmlBlockProcessor => ({
						tags: [
							tag
						],
						preservesSourceIdentity: true,
						process: () => []
					});

				expect(
					() =>
						new HtmlBlockProcessorRegistry([
							processor(
								'div'
							),
							processor(
								'div'
							)
						])
				).toThrow(
					'Duplicate HTML block processor for <div>.'
				);
			}
		);

		it(
			'rejects processing a tag with no registered strategy',
			() => {
				const registry =
					new HtmlBlockProcessorRegistry([]);

				expect(
					() =>
						registry.process(
							element(
								'unknown'
							),
							context()
						)
				).toThrow(
					'No HTML block processor registered for <unknown>.'
				);
			}
		);
	}
);

function element(
	name: string,
	attribs: Record<string, string> = {}
): Element {
	return {
		name,
		attribs
	} as Element;
}

function context():
	HtmlBlockProcessorContext {
	return {
		parseBlockChildren: () => [],
		parseInlineChildren: () => [],
		createBlock: (_element, block) => ({
			...block,
			id: `test-${block.type}`
		})
	};
}
