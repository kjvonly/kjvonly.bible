import { describe, expect, it } from 'vitest';
import { findNormalizedContentWordElement } from '$lib/domains/normalized-content/ui/addressing/normalized-content-word-target';

/** Tests the mounted-Reader DOM lookup without turning opaque IDs into selectors. */
describe('Normalized Bookmark Browse word lookup', () => {
    it('finds the exact word inside its block, not a nested block with the same index', () => {
        const root = document.createElement('div');
        root.innerHTML = `
            <div id="p/a:%-__proto__" data-normalized-block>
                <span data-normalized-content-kind="word" data-normalized-content-index="0">First</span>
                <div id="child" data-normalized-block>
                    <span data-normalized-content-kind="word" data-normalized-content-index="0">Nested</span>
                </div>
                <span data-normalized-content-kind="anchor" data-normalized-content-index="1"></span>
                <span data-normalized-content-kind="word" data-normalized-content-index="2">Selected</span>
            </div>`;
        expect(findNormalizedContentWordElement(root, { blockId: 'p/a:%-__proto__', contentIndex: 2 })?.textContent)
            .toBe('Selected');
        expect(findNormalizedContentWordElement(root, { blockId: 'p/a:%-__proto__', contentIndex: 0 })?.textContent)
            .toBe('First');
        expect(findNormalizedContentWordElement(root, { blockId: 'child', contentIndex: 0 })?.textContent)
            .toBe('Nested');
        expect(findNormalizedContentWordElement(root, { blockId: 'p/a:%-__proto__', contentIndex: 1 }))
            .toBeUndefined();
        expect(findNormalizedContentWordElement(root, { blockId: 'missing', contentIndex: 2 }))
            .toBeUndefined();
    });
});
