import {
	afterEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	NormalizedContentAddress
} from '$lib/domains/normalized-content';
import {
	normalizedContentTextMarkupDrag
} from '$lib/domains/normalized-content/modules/reader/interactions/normalized-content-text-markup-drag';

let root: HTMLDivElement | undefined;
let destroyAction: (() => void) | undefined;

afterEach(() => {
	destroyAction?.();
	root?.remove();
	root = undefined;
	destroyAction = undefined;
	vi.restoreAllMocks();
});

describe(
	'normalizedContentTextMarkupDrag',
	() => {
		it(
			'applies canonical word addresses across non-word content and suppresses the release click',
			() => {
				const fixture = createFixture();
				const onApply = vi.fn();
				const onRemove = vi.fn();

				mockElementFromPoint((x) =>
					x < 20
						? fixture.firstWord
						: fixture.secondWord
				);
				mountAction(onApply, onRemove);

				dispatchPointer(
					fixture.firstWord,
					'pointerdown',
					1,
					5,
					10
				);
				dispatchPointer(
					fixture.firstWord,
					'pointermove',
					1,
					40,
					10
				);
				dispatchPointer(
					fixture.secondWord,
					'pointerup',
					1,
					40,
					10
				);

				expect(addressCalls(onApply)).toEqual([
					{
						blockId: 'nested-paragraph',
						contentIndex: 0
					},
					{
						blockId: 'nested-paragraph',
						contentIndex: 2
					}
				]);
				expect(onRemove).not.toHaveBeenCalled();

				const clicked = vi.fn();
				fixture.secondWord.addEventListener(
					'click',
					clicked
				);
				const click = new MouseEvent(
					'click',
					{
						bubbles: true,
						cancelable: true,
						button: 0
					}
				);

				fixture.secondWord.dispatchEvent(click);

				expect(click.defaultPrevented).toBe(true);
				expect(clicked).not.toHaveBeenCalled();
			}
		);

		it(
			'removes markup right-to-left while keeping block/content identity exact',
			() => {
				const fixture = createFixture();
				const onApply = vi.fn();
				const onRemove = vi.fn();

				mockElementFromPoint((x) =>
					x < 20
						? fixture.firstWord
						: fixture.secondWord
				);
				mountAction(onApply, onRemove);

				dispatchPointer(
					fixture.secondWord,
					'pointerdown',
					2,
					40,
					10
				);
				dispatchPointer(
					fixture.secondWord,
					'pointermove',
					2,
					5,
					10
				);
				dispatchPointer(
					fixture.firstWord,
					'pointerup',
					2,
					5,
					10
				);

				expect(onApply).not.toHaveBeenCalled();
				expect(addressCalls(onRemove)).toEqual([
					{
						blockId: 'nested-paragraph',
						contentIndex: 2
					},
					{
						blockId: 'nested-paragraph',
						contentIndex: 0
					}
				]);
			}
		);

		it(
			'leaves vertical movement to scrolling and does not suppress the click',
			() => {
				const fixture = createFixture();
				const onApply = vi.fn();
				const onRemove = vi.fn();

				mockElementFromPoint(() => fixture.firstWord);
				mountAction(onApply, onRemove);

				dispatchPointer(
					fixture.firstWord,
					'pointerdown',
					3,
					10,
					10
				);
				dispatchPointer(
					fixture.firstWord,
					'pointermove',
					3,
					12,
					35
				);

				expect(onApply).not.toHaveBeenCalled();
				expect(onRemove).not.toHaveBeenCalled();

				const clicked = vi.fn();
				fixture.firstWord.addEventListener(
					'click',
					clicked
				);
				const click = new MouseEvent(
					'click',
					{
						bubbles: true,
						cancelable: true,
						button: 0
					}
				);

				fixture.firstWord.dispatchEvent(click);

				expect(click.defaultPrevented).toBe(false);
				expect(clicked).toHaveBeenCalledTimes(1);
			}
		);

		it(
			'ignores anchors and word-shaped nodes outside the action root',
			() => {
				const fixture = createFixture();
				const outside = createOutsideWord();
				const onApply = vi.fn();
				const onRemove = vi.fn();

				mountAction(onApply, onRemove);
				mockElementFromPoint(() => fixture.anchor);

				dispatchPointer(
					fixture.anchor,
					'pointerdown',
					4,
					10,
					10
				);
				dispatchPointer(
					fixture.anchor,
					'pointermove',
					4,
					40,
					10
				);

				expect(onApply).not.toHaveBeenCalled();
				expect(onRemove).not.toHaveBeenCalled();

				vi.restoreAllMocks();
				mockElementFromPoint(() => outside.word);
				dispatchPointer(
					root ?? fixture.firstWord,
					'pointerdown',
					5,
					10,
					10
				);
				dispatchPointer(
					root ?? fixture.firstWord,
					'pointermove',
					5,
					40,
					10
				);

				expect(onApply).not.toHaveBeenCalled();
				expect(onRemove).not.toHaveBeenCalled();
				outside.block.remove();
			}
		);
	}
);

function mountAction(
	onApply: (target: NormalizedContentAddress) => void,
	onRemove: (target: NormalizedContentAddress) => void
): void {
	if (!root) {
		throw new Error('Expected drag fixture root.');
	}

	const action = normalizedContentTextMarkupDrag(
		root,
		{
			enabled: true,
			onApply,
			onRemove
		}
	);
	destroyAction = action.destroy;
}

function createFixture(): {
	firstWord: HTMLSpanElement;
	anchor: HTMLSpanElement;
	secondWord: HTMLSpanElement;
} {
	root = document.createElement('div');
	root.innerHTML = `
		<blockquote id="quote" data-normalized-block>
			<p id="nested-paragraph" data-normalized-block>
				<span data-normalized-content-index="0" data-normalized-content-kind="word">First</span>
				<span id="inline-anchor" data-normalized-content-index="1" data-normalized-content-kind="anchor"></span>
				<span data-normalized-content-index="2" data-normalized-content-kind="word">Second</span>
			</p>
		</blockquote>
	`;
	document.body.append(root);

	return {
		firstWord: requireSpan(
			'[data-normalized-content-index="0"]'
		),
		anchor: requireSpan(
			'[data-normalized-content-kind="anchor"]'
		),
		secondWord: requireSpan(
			'[data-normalized-content-index="2"]'
		)
	};
}

function createOutsideWord(): {
	block: HTMLParagraphElement;
	word: HTMLSpanElement;
} {
	const block = document.createElement('p');
	block.id = 'outside-paragraph';
	block.dataset.normalizedBlock = '';
	const word = document.createElement('span');
	word.dataset.normalizedContentIndex = '0';
	word.dataset.normalizedContentKind = 'word';
	block.append(word);
	document.body.append(block);
	return {
		block,
		word
	};
}

function requireSpan(
	selector: string
): HTMLSpanElement {
	const element = root?.querySelector(selector);

	if (!(element instanceof HTMLSpanElement)) {
		throw new Error(
			`Expected span matching ${selector}.`
		);
	}

	return element;
}

function mockElementFromPoint(
	resolve: (x: number, y: number) => Element | null
): void {
	vi.spyOn(
		document,
		'elementFromPoint'
	).mockImplementation(resolve);
}

function dispatchPointer(
	target: EventTarget,
	type: 'pointerdown' | 'pointermove' | 'pointerup',
	pointerId: number,
	clientX: number,
	clientY: number
): void {
	target.dispatchEvent(
		new PointerEvent(
			type,
			{
				bubbles: true,
				cancelable: true,
				button: 0,
				clientX,
				clientY,
				isPrimary: true,
				pointerId
			}
		)
	);
}

function addressCalls(
	mock: ReturnType<typeof vi.fn>
): NormalizedContentAddress[] {
	return mock.mock.calls.map(
		(call) => call[0] as NormalizedContentAddress
	);
}
