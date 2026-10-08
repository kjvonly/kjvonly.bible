import {
	afterEach,
	describe,
	expect,
	it
} from 'vitest';

import {
	mount,
	unmount
} from 'svelte';

import type {
	NormalizedDocument
} from '$lib/domains/normalized-content';

import {
	NormalizedContentRenderer
} from '$lib/domains/normalized-content/ui';

let target: HTMLDivElement | undefined;
let component: ReturnType<typeof mount> | undefined;

afterEach(async () => {
	if (component) {
		await unmount(
			component
		);
	}

	target?.remove();
	target = undefined;
	component = undefined;
});

describe(
	'NormalizedContentRenderer structural semantics',
	() => {
		it(
			'renders preformatted content and thematic breaks as semantic elements with exact IDs',
			() => {
				mountDocument({
					blocks: [
						{
							type:
								'preformatted',
							id:
								'preformatted-1',
							content: [
								{
									type:
										'word',
									text:
										'Alpha'
								},
								{
									type:
										'line-break'
								},
								{
									type:
										'word',
									text:
										'Bravo'
								}
							]
						},
						{
							type:
								'thematic-break',
							id:
								'thematic-break-1'
						}
					]
				});

				const preformatted =
					requireElement(
						'#preformatted-1',
						HTMLPreElement
					);
				const thematicBreak =
					requireElement(
						'#thematic-break-1',
						HTMLHRElement
					);

				expect(
					preformatted.querySelector(
						'br'
					)
				).toBeInstanceOf(
					HTMLBRElement
				);
				expect(
					preformatted.textContent
				).toBe(
					'AlphaBravo'
				);
				expect(
					thematicBreak.childNodes
				).toHaveLength(
					0
				);
			}
		);

		it(
			'renders figure captions with contextual semantic elements and exact IDs',
			() => {
				mountDocument({
					blocks: [
						{
							type:
								'figure',
							id:
								'figure-1',
							blocks: [
								{
									type:
										'paragraph',
									id:
										'figure-body',
									content: [
										{
											type:
												'word',
											text:
												'Figure'
										}
									]
								},
								{
									type:
										'caption',
									id:
										'figure-caption',
									blocks: [
										{
											type:
												'paragraph',
											id:
												'caption-body',
											content: [
												{
													type:
														'word',
													text:
														'Caption'
												}
											]
										}
									]
								}
							]
						}
					]
				});

				const figure =
					requireElement(
						'#figure-1',
						HTMLElement
					);
				const caption =
					requireElement(
						'#figure-caption',
						HTMLElement
					);

				expect(
					figure.tagName
				).toBe(
					'FIGURE'
				);
				expect(
					caption.tagName
				).toBe(
					'FIGCAPTION'
				);
				expect(
					caption.parentElement
				).toBe(
					figure
				);
				expect(
					caption.querySelector(
						'#caption-body'
					)?.textContent
				).toBe(
					'Caption'
				);
			}
		);

		it(
			'renders table captions rows and header/data cells with canonical semantics and IDs',
			() => {
				mountDocument({
					blocks: [
						{
							type:
								'table',
							id:
								'table-1',
							blocks: [
								{
									type:
										'caption',
									id:
										'table-caption',
									blocks: [
										{
											type:
												'paragraph',
											id:
												'table-caption-body',
											content: [
												{
													type:
														'word',
													text:
														'Caption'
												}
											]
										}
									]
								},
								{
									type:
										'table-row',
									id:
										'table-row-1',
									blocks: [
										{
											type:
												'table-cell',
											id:
												'table-header-1',
											header:
												true,
											blocks: [
												{
													type:
														'paragraph',
													id:
														'header-body',
													content: [
														{
															type:
																'word',
															text:
																'Header'
														}
													]
												}
											]
										},
										{
											type:
												'table-cell',
											id:
												'table-data-1',
											header:
												false,
											blocks: [
												{
													type:
														'paragraph',
													id:
														'data-body',
													content: [
														{
															type:
																'word',
															text:
																'Data'
														}
													]
												}
											]
										}
									]
								}
							]
						}
					]
				});

				const table =
					requireElement(
						'#table-1',
						HTMLTableElement
					);
				const caption =
					requireElement(
						'#table-caption',
						HTMLTableCaptionElement
					);
				const row =
					requireElement(
						'#table-row-1',
						HTMLTableRowElement
					);
				const headerCell =
					requireElement(
						'#table-header-1',
						HTMLTableCellElement
					);
				const dataCell =
					requireElement(
						'#table-data-1',
						HTMLTableCellElement
					);

				expect(
					caption.parentElement
				).toBe(
					table
				);
				expect(
					table.contains(
						row
					)
				).toBe(
					true
				);
				expect(
					headerCell.tagName
				).toBe(
					'TH'
				);
				expect(
					dataCell.tagName
				).toBe(
					'TD'
				);
				expect(
					row.cells
				).toHaveLength(
					2
				);
				expect(
					caption.textContent
				).toBe(
					'Caption'
				);
				expect(
					headerCell.querySelector(
						'#header-body'
					)?.textContent
				).toBe(
					'Header'
				);
				expect(
					dataCell.querySelector(
						'#data-body'
					)?.textContent
				).toBe(
					'Data'
				);
			}
		);
	}
);

/** Mounts one canonical document through the production normalized renderer. */
function mountDocument(
	document: NormalizedDocument
): void {
	target =
		window.document.createElement(
			'div'
		);
	window.document.body.append(
		target
	);

	component = mount(
		NormalizedContentRenderer,
		{
			target,
			props: {
				document
			}
		}
	);
}

/** Resolves one rendered element and verifies its concrete semantic element type. */
function requireElement<T extends Element>(
	selector: string,
	elementType: new () => T
): T {
	const element =
		target?.querySelector(
			selector
		);

	if (
		!(element instanceof
			elementType)
	) {
		throw new Error(
			`Expected normalized element: ${selector}`
		);
	}

	return element;
}
