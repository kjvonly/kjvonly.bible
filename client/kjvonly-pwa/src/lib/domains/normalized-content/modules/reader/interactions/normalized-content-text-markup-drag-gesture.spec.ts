import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	NormalizedContentAddress
} from '../../../models/normalized-content-address.model';
import {
	NormalizedContentTextMarkupDragGesture
} from './normalized-content-text-markup-drag-gesture';

function target(
	blockId: string,
	contentIndex: number
): NormalizedContentAddress {
	return {
		blockId,
		contentIndex
	};
}

describe(
	'NormalizedContentTextMarkupDragGesture',
	() => {
		it(
			'keeps movement below the threshold as a normal click',
			() => {
				const onApply = vi.fn();
				const gesture =
					createGesture({
						onApply,
						resolveTarget: () =>
							target('paragraph-1', 2)
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
			'locks left-to-right movement as apply and processes each address once',
			() => {
				const onApply = vi.fn();
				const onRemove = vi.fn();
				const gesture =
					createGesture({
						onApply,
						onRemove,
						resolveTarget: ({ x }) =>
							target(
								'paragraph-1',
								Math.floor(x / 20)
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
						(call: [NormalizedContentAddress]) =>
							call[0].contentIndex
					)
				).toEqual([
					0,
					1,
					2,
					3
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
								'paragraph-2',
								Math.floor(x / 20)
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
						(call: [NormalizedContentAddress]) =>
							call[0].contentIndex
					)
				).toEqual([
					3,
					2,
					1,
					0
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
							target('paragraph-3', 0)
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
			'interpolates fast movement so intermediate content indexes are not skipped',
			() => {
				const onApply = vi.fn();
				const gesture =
					createGesture({
						onApply,
						resolveTarget: ({ x }) =>
							target(
								'paragraph-4',
								Math.floor(x / 10)
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
						(call: [NormalizedContentAddress]) =>
							call[0].contentIndex
					)
				).toEqual([
					0,
					1,
					2,
					3,
					4,
					5,
					6,
					7
				]);
			}
		);

		it(
			'treats the same content index in different blocks as distinct targets',
			() => {
				const onApply = vi.fn();
				const gesture =
					createGesture({
						onApply,
						resolveTarget: ({ x }) =>
							x < 20
							? target('left:block', 0)
							: target('right:block', 0)
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
						(call: [NormalizedContentAddress]) =>
							call[0]
					)
				).toEqual([
					target('left:block', 0),
					target('right:block', 0)
				]);
			}
		);
	}
);

function createGesture(
	overrides: Partial<
		ConstructorParameters<
			typeof NormalizedContentTextMarkupDragGesture
		>[0]
	> = {}
): NormalizedContentTextMarkupDragGesture {
	const gesture =
		new NormalizedContentTextMarkupDragGesture({
			resolveTarget: () => target('paragraph', 0),
			onApply: () => {},
			onRemove: () => {},
			onDragStart: () => {},
			onDragEnd: () => {},
			...overrides
		});

	gesture.setEnabled(true);
	return gesture;
}
