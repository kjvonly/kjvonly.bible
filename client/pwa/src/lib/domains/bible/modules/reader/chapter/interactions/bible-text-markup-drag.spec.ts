import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	BibleTextMarkupDragGesture,
	type BibleTextMarkupDragTarget
} from './bible-text-markup-drag-gesture';

function target(
	verseNumber: number,
	wordIndex: number
): BibleTextMarkupDragTarget {
	return {
		verseNumber,
		wordIndex
	};
}

describe(
	'BibleTextMarkupDragGesture',
	() => {
		it(
			'keeps movement below the threshold as a normal click',
			() => {
				const onApply = vi.fn();
				const gesture =
					createGesture({
						onApply,
						resolveTarget: () =>
							target(3, 17)
					});

				gesture.pointerDown(
					1,
					{ x: 10, y: 10 },
					true,
					0
				);
				gesture.pointerMove(
					1,
					{ x: 18, y: 11 }
				);
				gesture.pointerUp(1);

				expect(onApply).not.toHaveBeenCalled();
				expect(
					gesture.consumeSuppressedClick()
				).toBe(false);
			}
		);

		it(
			'locks left-to-right movement as apply and processes each word once',
			() => {
				const onApply = vi.fn();
				const onRemove = vi.fn();
				const gesture =
					createGesture({
						onApply,
						onRemove,
						resolveTarget: ({ x }) =>
							target(
								3,
								Math.floor(x / 20) + 1
							)
					});

				gesture.pointerDown(
					2,
					{ x: 5, y: 10 },
					true,
					0
				);
				gesture.pointerMove(
					2,
					{ x: 65, y: 11 }
				);
				gesture.pointerMove(
					2,
					{ x: 45, y: 11 }
				);
				gesture.pointerUp(2);

				expect(
					onApply.mock.calls.map(
						(call: [BibleTextMarkupDragTarget]) =>
						call[0].wordIndex
					)
				).toEqual([
					1,
					2,
					3,
					4
				]);
				expect(onRemove).not.toHaveBeenCalled();
				expect(
					gesture.consumeSuppressedClick()
				).toBe(true);
				expect(
					gesture.consumeSuppressedClick()
				).toBe(false);
			}
		);

		it(
			'locks right-to-left movement as remove',
			() => {
				const onApply = vi.fn();
				const onRemove = vi.fn();
				const gesture =
					createGesture({
						onApply,
						onRemove,
						resolveTarget: ({ x }) =>
							target(
								4,
								Math.floor(x / 20) + 1
							)
					});

				gesture.pointerDown(
					3,
					{ x: 65, y: 10 },
					true,
					0
				);
				gesture.pointerMove(
					3,
					{ x: 5, y: 11 }
				);
				gesture.pointerUp(3);

				expect(onApply).not.toHaveBeenCalled();
				expect(
					onRemove.mock.calls.map(
						(call: [BibleTextMarkupDragTarget]) =>
						call[0].wordIndex
					)
				).toEqual([
					4,
					3,
					2,
					1
				]);
			}
		);

		it(
			'abandons a vertical gesture without claiming the click',
			() => {
				const onApply = vi.fn();
				const onRemove = vi.fn();
				const gesture =
					createGesture({
						onApply,
						onRemove,
						resolveTarget: () =>
							target(5, 2)
					});

				gesture.pointerDown(
					4,
					{ x: 20, y: 20 },
					true,
					0
				);
				gesture.pointerMove(
					4,
					{ x: 22, y: 40 }
				);
				gesture.pointerMove(
					4,
					{ x: 80, y: 40 }
				);

				expect(onApply).not.toHaveBeenCalled();
				expect(onRemove).not.toHaveBeenCalled();
				expect(
					gesture.consumeSuppressedClick()
				).toBe(false);
			}
		);

		it(
			'interpolates fast movement so intermediate words are not skipped',
			() => {
				const onApply = vi.fn();
				const gesture =
					createGesture({
						onApply,
						resolveTarget: ({ x }) =>
							target(
								6,
								Math.floor(x / 10) + 1
							)
					});

				gesture.pointerDown(
					5,
					{ x: 1, y: 10 },
					true,
					0
				);
				gesture.pointerMove(
					5,
					{ x: 79, y: 10 }
				);

				expect(
					onApply.mock.calls.map(
						(call: [BibleTextMarkupDragTarget]) =>
						call[0].wordIndex
					)
				).toEqual([
					1,
					2,
					3,
					4,
					5,
					6,
					7,
					8
				]);
			}
		);

		it(
			'includes the verse number when an apply stroke starts on it',
			() => {
				const onApply = vi.fn();
				const gesture =
					createGesture({
						onApply,
						resolveTarget: ({ x }) =>
							x < 20
							? target(7, 0)
							: target(7, 1)
					});

				gesture.pointerDown(
					6,
					{ x: 5, y: 10 },
					true,
					0
				);
				gesture.pointerMove(
					6,
					{ x: 40, y: 10 }
				);

				expect(
					onApply.mock.calls.map(
						(call: [BibleTextMarkupDragTarget]) =>
							call[0].wordIndex
					)
				).toEqual([0, 1]);
			}
		);

		it(
			'includes the verse number when a remove stroke crosses it',
			() => {
				const onRemove = vi.fn();
				const gesture =
					createGesture({
						onRemove,
						resolveTarget: ({ x }) =>
							x < 20
							? target(8, 0)
							: target(8, 1)
					});

				gesture.pointerDown(
					7,
					{ x: 40, y: 10 },
					true,
					0
				);
				gesture.pointerMove(
					7,
					{ x: 5, y: 10 }
				);

				expect(
					onRemove.mock.calls.map(
						(call: [BibleTextMarkupDragTarget]) =>
							call[0].wordIndex
					)
				).toEqual([1, 0]);
			}
		);
	}
);

function createGesture(
	overrides: Partial<
		ConstructorParameters<
			typeof BibleTextMarkupDragGesture
		>[0]
	> = {}
): BibleTextMarkupDragGesture {
	const gesture = new BibleTextMarkupDragGesture({
		resolveTarget: () => target(1, 1),
		onApply: () => {},
		onRemove: () => {},
		onDragStart: () => {},
		onDragEnd: () => {},
		...overrides
	});

	gesture.setEnabled(true);
	return gesture;
}
