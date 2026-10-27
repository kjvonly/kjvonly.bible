import { describe, expect, it } from 'vitest';
import type { NormalizedBlock, NormalizedDocument } from '@kjvonly/normalized-content';
import { NormalizedContentBlockWindow, type NormalizedContentBlockWindowChange } from './normalized-content-block-window';

const paragraph = (id: string): NormalizedBlock => ({
    type: 'paragraph', id, content: [{ type: 'word', text: id }]
});

/** Deeply nested structure representative of a single Spurgeon sermon root. */
function nestedSermon(): NormalizedDocument {
    return {
        blocks: [
            paragraph('title'),
            { type: 'quote', id: 'sermon', blocks: [
                { type: 'quote', id: 'section', blocks: Array.from({ length: 120 }, (_, index) => paragraph(`p-${index}`)) }
            ] },
            paragraph('closing')
        ]
    };
}

describe('Normalized Content text-length progress', () => {
    it('weights long paragraphs by cumulative text rather than the number of blocks', () => {
        const window = new NormalizedContentBlockWindow(() => {});
        window.reset({ blocks: [
            { type: 'paragraph', id: 'short', content: [{ type: 'word', text: 'a' }] },
            { type: 'paragraph', id: 'long', content: [{ type: 'word', text: 'x'.repeat(98) }] }
        ] });
        // With one space per token, the first of 100 characters occupies 2%.
        expect(window.getTextProgress(0)).toBe(0);
        expect(window.getTextProgress(1)).toBeCloseTo(0.02);
        expect(window.getTextProgress(1, 0.5)).toBeCloseTo(0.51);
        expect(window.getTextProgress(2)).toBe(1);
        window.prepareIndex(1);
        expect(window.getTextProgress(1)).toBeCloseTo(0.02);
    });

    it('seeks by cumulative text length without scanning the mounted window', () => {
        const window = new NormalizedContentBlockWindow(() => {});
        window.reset({ blocks: [
            { type: 'paragraph', id: 'short', content: [{ type: 'word', text: 'a' }] },
            { type: 'paragraph', id: 'long', content: [{ type: 'word', text: 'x'.repeat(98) }] }
        ] });
        expect(window.findTextPosition(0)).toEqual({ index: 0, fraction: 0 });
        expect(window.findTextPosition(0.01)?.index).toBe(0);
        expect(window.findTextPosition(0.01)?.fraction).toBeCloseTo(0.505);
        expect(window.findTextPosition(0.51)?.index).toBe(1);
        expect(window.findTextPosition(0.51)?.fraction).toBeCloseTo(0.5001);
        expect(window.findTextPosition(1)).toEqual({ index: 1, fraction: 1 });
        expect(window.findTextPosition(10)).toEqual({ index: 1, fraction: 1 });

        expect(window.prepareIndex(window.findTextPosition(0.51)!.index)).toBe(true);
        expect(window.getRange()).toEqual({ start: 1, end: 2, total: 2 });
        expect(window.findTextPosition(0.01)?.index).toBe(0);
        expect(window.findTextPosition(0.01)?.fraction).toBeCloseTo(0.505);
        window.reset();
        expect(window.findTextPosition(0.5)).toBeUndefined();
    });

    it('counts nested table-row text as one atomic leaf and resets for new documents', () => {
        const window = new NormalizedContentBlockWindow(() => {});
        window.reset({ blocks: [
            { type: 'table', id: 'table', blocks: [{
                type: 'table-row', id: 'row', blocks: [{
                    type: 'table-cell', id: 'cell', header: false, blocks: [
                        { type: 'paragraph', id: 'nested', content: [{ type: 'word', text: 'a'.repeat(8) }] }
                    ]
                }]
            }] },
            { type: 'paragraph', id: 'after', content: [{ type: 'word', text: 'b'.repeat(8) }] }
        ] });
        expect(window.getRange().total).toBe(2);
        expect(window.getTextProgress(1)).toBeCloseTo(0.5);
        window.reset({ blocks: [{ type: 'thematic-break', id: 'break' }] });
        expect(window.getTextProgress(0)).toBe(0);
        expect(window.getTextProgress(1)).toBe(1);
        window.reset();
        expect(window.getTextProgress(0)).toBe(0);
    });
});

describe('Normalized Content nested block window', () => {
    it('does not render all descendants of a mounted container', () => {
        const original = nestedSermon();
        let change: NormalizedContentBlockWindowChange | undefined;
        const window = new NormalizedContentBlockWindow((value) => { change = value; });
        window.reset(original);
        expect(window.getRange()).toEqual({ start: 0, end: 1, total: 122 });
        expect(change?.blocks).toHaveLength(1);
        window.append();
        expect(change?.blocks).toHaveLength(2);
        const sermon = change?.blocks[1];
        expect(sermon?.id).toBe('sermon');
        if (!sermon || !('blocks' in sermon)) throw new Error('Expected container');
        const section = sermon.blocks[0];
        if (!section || !('blocks' in section)) throw new Error('Expected nested section');
        expect(section.blocks.map((block) => block.id)).toEqual(['p-0']);
        expect(change?.indices.get('p-0')).toBe(2);
        expect(original.blocks[1] && 'blocks' in original.blocks[1] && original.blocks[1].blocks[0]
            && 'blocks' in original.blocks[1].blocks[0] && original.blocks[1].blocks[0].blocks).toHaveLength(120);
    });

    it('uses zero-based target indices and one-based DOM positions', () => {
        const document: NormalizedDocument = { blocks: [
            { type: 'paragraph', id: 'first', content: [
                { type: 'anchor', id: 'first-anchor' }, { type: 'word', text: 'First' }
            ] },
            paragraph('second'),
            paragraph('third')
        ] };
        let state!: NormalizedContentBlockWindowChange;
        const window = new NormalizedContentBlockWindow((change) => { state = change; });
        window.reset(document);

        expect(window.getRange()).toEqual({ start: 0, end: 1, total: 3 });
        expect(window.findBlockIndex('first')).toBe(0);
        expect(window.findBlockIndex('first-anchor')).toBe(0);
        expect(window.findBlockIndex('third')).toBe(2);
        expect(state.indices.get('first')).toBe(1);
        expect(window.getLeafId(0)).toBeUndefined();
        expect(window.getLeafId(1)).toBe('first');
        expect(window.getLeafId(3)).toBe('third');
        expect(window.getLeafId(4)).toBeUndefined();

        expect(window.prepareIndex(window.findBlockIndex('third')!)).toBe(true);
        expect(window.getRange()).toEqual({ start: 2, end: 3, total: 3 });
        expect(state.indices.get('third')).toBe(3);
        expect(state.indices.has('first')).toBe(false);
        expect(window.prepareIndex(3)).toBe(false);
    });

    it('jumps to a deep leaf and preserves the canonical IDs when prepending/trimming', () => {
        const source = nestedSermon();
        let current!: NormalizedContentBlockWindowChange;
        const window = new NormalizedContentBlockWindow((value) => { current = value; });
        window.reset(source);
        expect(window.findBlockIndex('section')).toBe(1);
        expect(window.findBlockIndex('p-109')).toBe(110);
        expect(window.findBlockIndex('sermon')).toBe(1);
        expect(window.getLeafId(111)).toBe('p-109');
        expect(window.getLeafId(122)).toBe('closing');
        expect(window.getLeafId(123)).toBeUndefined();
        expect(window.prepareIndex(110)).toBe(true);
        expect(current.indices.get('p-109')).toBe(111);
        expect(current.blocks.map((block) => block.id)).toEqual(['sermon']);
        window.prepend();
        expect(current.indices.get('p-108')).toBe(110);
        window.append();
        expect(current.indices.get('p-110')).toBe(112);
        window.removeFirst();
        expect(current.indices.has('p-108')).toBe(false);
        window.removeLast();
        expect(current.indices.has('p-110')).toBe(false);
    });

    it('renders complete table rows and preserves nested cell/anchor navigation', () => {
        const document: NormalizedDocument = {
            blocks: [{
                type: 'table', id: 'table', blocks: [
                    {
                        type: 'table-row', id: 'row-1', blocks: [
                            { type: 'table-cell', id: 'cell-1a', header: false, blocks: [
                                paragraph('cell-1a-text')
                            ] },
                            { type: 'table-cell', id: 'cell-1b', header: false, blocks: [
                                { type: 'paragraph', id: 'cell-1b-text', content: [
                                    { type: 'anchor', id: 'cell-anchor' },
                                    { type: 'word', text: 'Cell' }
                                ] }
                            ] }
                        ]
                    },
                    {
                        type: 'table-row', id: 'row-2', blocks: [
                            { type: 'table-cell', id: 'cell-2a', header: false, blocks: [
                                paragraph('cell-2a-text')
                            ] },
                            { type: 'table-cell', id: 'cell-2b', header: false, blocks: [
                                paragraph('cell-2b-text')
                            ] }
                        ]
                    }
                ]
            }]
        };
        let rendered!: NormalizedContentBlockWindowChange;
        const window = new NormalizedContentBlockWindow((change) => { rendered = change; });
        window.reset(document);
        expect(window.getRange()).toEqual({ start: 0, end: 1, total: 2 });
        expect(window.findBlockIndex('cell-1a')).toBe(0);
        expect(window.findBlockIndex('cell-1b-text')).toBe(0);
        expect(window.findBlockIndex('cell-anchor')).toBe(0);
        expect(window.findBlockIndex('cell-2b-text')).toBe(1);
        expect(rendered.indices.get('row-1')).toBe(1);
        expect(rendered.indices.has('cell-1b-text')).toBe(false);

        const table = rendered.blocks[0];
        if (!table || table.type !== 'table') throw new Error('Expected table');
        expect(table.blocks.map((block) => block.id)).toEqual(['row-1']);
        const row = table.blocks[0];
        if (!row || row.type !== 'table-row') throw new Error('Expected first row');
        expect(row.blocks.map((cell) => cell.id)).toEqual(['cell-1a', 'cell-1b']);
        expect(row.blocks[1] && 'blocks' in row.blocks[1] && row.blocks[1].blocks[0]?.id)
            .toBe('cell-1b-text');

        expect(window.prepareIndex(window.findBlockIndex('cell-2b-text')!)).toBe(true);
        const secondTable = rendered.blocks[0];
        if (!secondTable || secondTable.type !== 'table') throw new Error('Expected table');
        expect(secondTable.blocks.map((block) => block.id)).toEqual(['row-2']);
        const secondRow = secondTable.blocks[0];
        if (!secondRow || secondRow.type !== 'table-row') throw new Error('Expected second row');
        expect(secondRow.blocks).toHaveLength(2);
    });

    it('preserves numbering of partially mounted ordered lists, including nested lists', () => {
        const document: NormalizedDocument = { blocks: [{
            type: 'list', id: 'ordered', ordered: true, blocks: Array.from({ length: 10 }, (_, n) => ({
                type: 'list-item' as const, id: `item-${n + 1}`,
                blocks: n === 6
                    ? [{ type: 'list' as const, id: 'nested', ordered: true, blocks: [
                        { type: 'list-item' as const, id: 'nested-1', blocks: [paragraph('nested-p-1')] },
                        { type: 'list-item' as const, id: 'nested-2', blocks: [paragraph('nested-p-2')] },
                        { type: 'list-item' as const, id: 'nested-3', blocks: [paragraph('nested-p-3')] }
                    ] }]
                    : [paragraph(`p-${n + 1}`)]
            }))
        }] };
        let state!: NormalizedContentBlockWindowChange;
        const window = new NormalizedContentBlockWindow((change) => { state = change; });
        window.reset(document);
        expect(state.orderedListStarts.size).toBe(0);

        window.prepareIndex(window.findBlockIndex('p-5')!);
        expect(state.orderedListStarts.get('ordered')).toBe(5);
        expect(state.blocks[0]?.type).toBe('list');
        expect(state.blocks[0] && 'blocks' in state.blocks[0] && state.blocks[0].blocks[0]?.id)
            .toBe('item-5');

        window.prepareIndex(window.findBlockIndex('nested-p-2')!);
        expect(state.orderedListStarts.get('ordered')).toBe(7);
        expect(state.orderedListStarts.get('nested')).toBe(2);
        window.prepend();
        expect(state.orderedListStarts.get('nested')).toBeUndefined();

        window.reset({ blocks: [paragraph('other')] });
        expect(state.orderedListStarts.size).toBe(0);
    });

    it('invalidates reconciliation only on reset or an explicit valid jump', () => {
        const window = new NormalizedContentBlockWindow(() => {});
        const initial = window.getGeneration();
        window.reset({ blocks: [paragraph('a'), paragraph('b'), paragraph('c')] });
        expect(window.getGeneration()).toBe(initial + 1);
        expect(window.append()).toBe(true);
        expect(window.removeFirst()).toBe(true);
        expect(window.getGeneration()).toBe(initial + 1);
        expect(window.prepareIndex(100)).toBe(false);
        expect(window.getGeneration()).toBe(initial + 1);
        expect(window.prepareIndex(2)).toBe(true);
        expect(window.getGeneration()).toBe(initial + 2);
        window.reset();
        expect(window.getGeneration()).toBe(initial + 3);
    });

    it('handles empty documents, terminal leaves, and short subsequent documents', () => {
        let state!: NormalizedContentBlockWindowChange;
        const window = new NormalizedContentBlockWindow((change) => { state = change; });
        window.reset({ blocks: [] });
        expect(state.total).toBe(0);
        expect(window.append()).toBe(false);
        window.reset(nestedSermon());
        window.prepareIndex(121);
        expect(state.indices.get('closing')).toBe(122);
        expect(window.append()).toBe(false);
        window.reset({ blocks: [paragraph('small')] });
        expect(state.indices.get('small')).toBe(1);
        expect(window.findBlockIndex('p-109')).toBeUndefined();
    });

    it('keeps empty and single-leaf documents at their exact boundaries', () => {
        const updates: NormalizedContentBlockWindowChange[] = [];
        const window = new NormalizedContentBlockWindow((change) => updates.push(change));
        window.reset({ blocks: [] });
        expect(window.getRange()).toEqual({ start: 0, end: 0, total: 0 });
        expect(updates.at(-1)?.blocks).toEqual([]);
        expect(window.getLeafId(1)).toBeUndefined();
        expect(window.prepareIndex(0)).toBe(false);
        expect(window.append()).toBe(false);
        expect(window.prepend()).toBe(false);
        expect(window.removeFirst()).toBe(false);
        expect(window.removeLast()).toBe(false);
        expect(updates).toHaveLength(1);

        const onlyLeaf = paragraph('only-leaf');
        const source: NormalizedDocument = { blocks: [{
            type: 'quote', id: 'wrapper', blocks: [onlyLeaf]
        }] };
        window.reset(source);
        expect(window.getRange()).toEqual({ start: 0, end: 1, total: 1 });
        expect(window.findBlockIndex('wrapper')).toBe(0);
        expect(window.findBlockIndex('only-leaf')).toBe(0);
        expect(window.getLeafId(1)).toBe('only-leaf');
        expect(window.getLeafId(2)).toBeUndefined();
        expect(updates.at(-1)?.indices.get('only-leaf')).toBe(1);
        expect(updates.at(-1)?.blocks[0]).toMatchObject({
            id: 'wrapper', blocks: [{ id: 'only-leaf' }]
        });
        expect(window.append()).toBe(false);
        expect(window.prepend()).toBe(false);
        expect(window.removeFirst()).toBe(false);
        expect(window.removeLast()).toBe(false);
        expect(updates).toHaveLength(2);
        expect(source.blocks[0]).toMatchObject({
            id: 'wrapper', blocks: [{ id: 'only-leaf' }]
        });
    });

    it('preserves first and terminal boundaries while extending and trimming', () => {
        let latest!: NormalizedContentBlockWindowChange;
        const window = new NormalizedContentBlockWindow((change) => { latest = change; });
        window.reset({ blocks: [paragraph('first'), paragraph('middle'), paragraph('last')] });
        expect(window.prepend()).toBe(false);
        expect(window.removeFirst()).toBe(false);
        expect(latest.indices.get('first')).toBe(1);

        expect(window.prepareIndex(2)).toBe(true);
        expect(window.getRange()).toEqual({ start: 2, end: 3, total: 3 });
        expect(latest.indices.get('last')).toBe(3);
        expect(window.append()).toBe(false);
        expect(window.removeLast()).toBe(false);
        expect(window.prepend()).toBe(true);
        expect(window.getRange()).toEqual({ start: 1, end: 3, total: 3 });
        expect(window.removeLast()).toBe(true);
        expect(window.getRange()).toEqual({ start: 1, end: 2, total: 3 });
        expect(window.append()).toBe(true);
        expect(window.getRange()).toEqual({ start: 1, end: 3, total: 3 });
        expect(latest.indices.get('last')).toBe(3);
        expect(window.getLeafId(3)).toBe('last');
    });

    it('keeps two panes of the same canonical document independently windowed', () => {
        const document: NormalizedDocument = { blocks: [
            paragraph('first'), paragraph('middle'), paragraph('last')
        ] };
        let left!: NormalizedContentBlockWindowChange;
        let right!: NormalizedContentBlockWindowChange;
        const leftWindow = new NormalizedContentBlockWindow((change) => { left = change; });
        const rightWindow = new NormalizedContentBlockWindow((change) => { right = change; });
        leftWindow.reset(document);
        rightWindow.reset(document);
        expect(leftWindow.append()).toBe(true);
        expect(rightWindow.prepareIndex(2)).toBe(true);
        expect(leftWindow.getRange()).toEqual({ start: 0, end: 2, total: 3 });
        expect(rightWindow.getRange()).toEqual({ start: 2, end: 3, total: 3 });
        expect(left.blocks.map((block) => block.id)).toEqual(['first', 'middle']);
        expect(right.blocks.map((block) => block.id)).toEqual(['last']);
        expect(left.indices.get('first')).toBe(1);
        expect(right.indices.get('last')).toBe(3);
        expect(leftWindow.getGeneration()).not.toBe(rightWindow.getGeneration());
        leftWindow.reset({ blocks: [paragraph('replacement')] });
        expect(rightWindow.getRange()).toEqual({ start: 2, end: 3, total: 3 });
        expect(right.blocks.map((block) => block.id)).toEqual(['last']);
        expect(document.blocks.map((block) => block.id)).toEqual(['first', 'middle', 'last']);
    });

    it('publishes once per committed change and never for rejected window operations', () => {
        const changes: NormalizedContentBlockWindowChange[] = [];
        const window = new NormalizedContentBlockWindow((change) => changes.push(change));
        const document: NormalizedDocument = { blocks: [paragraph('a'), paragraph('b'), paragraph('c')] };
        const expectPublications = (count: number) => expect(changes).toHaveLength(count);

        window.reset(document);
        expectPublications(1);
        expect(window.append()).toBe(true);
        expectPublications(2);
        expect(window.append()).toBe(true);
        expectPublications(3);
        expect(window.append()).toBe(false);
        expect(window.prepend()).toBe(false);
        expectPublications(3);

        expect(window.removeLast()).toBe(true);
        expect(window.removeFirst()).toBe(true);
        expectPublications(5);
        expect(window.removeLast()).toBe(false);
        expect(window.removeFirst()).toBe(false);
        expectPublications(5);

        expect(window.prepareIndex(-1)).toBe(false);
        expect(window.prepareIndex(3)).toBe(false);
        expectPublications(5);
        expect(window.prepareIndex(1)).toBe(true);
        expectPublications(6);
        // Explicit jumps still invalidate in-flight reconciliation and publish,
        // even when the target already occupies the same visible range.
        expect(window.prepareIndex(1)).toBe(true);
        expectPublications(7);

        window.reset({ blocks: [] });
        expectPublications(8);
        expect(changes[7]).toMatchObject({ blocks: [], start: 0, end: 0, total: 0 });
        window.reset();
        expectPublications(9);
    });

    it('publishes independent projections while preserving canonical leaf identity', () => {
        const document = nestedSermon();
        const changes: NormalizedContentBlockWindowChange[] = [];
        const window = new NormalizedContentBlockWindow((change) => changes.push(change));
        window.reset(document);
        window.append();

        const before = changes[1];
        const sermonBefore = before.blocks[1];
        if (!sermonBefore || !('blocks' in sermonBefore)) throw new Error('Missing projected sermon');
        const sectionBefore = sermonBefore.blocks[0];
        if (!sectionBefore || !('blocks' in sectionBefore)) throw new Error('Missing projected section');
        const canonicalSermon = document.blocks[1];
        if (!canonicalSermon || !('blocks' in canonicalSermon)) throw new Error('Missing canonical sermon');
        const canonicalSection = canonicalSermon.blocks[0];
        if (!canonicalSection || !('blocks' in canonicalSection)) throw new Error('Missing canonical section');

        expect(sermonBefore).not.toBe(canonicalSermon);
        expect(sectionBefore).not.toBe(canonicalSection);
        expect(sectionBefore.blocks[0]).toBe(canonicalSection.blocks[0]);
        expect(sectionBefore.blocks).toHaveLength(1);

        window.append();
        const after = changes[2];
        const sermonAfter = after.blocks[1];
        if (!sermonAfter || !('blocks' in sermonAfter)) throw new Error('Missing next projected sermon');
        const sectionAfter = sermonAfter.blocks[0];
        if (!sectionAfter || !('blocks' in sectionAfter)) throw new Error('Missing next projected section');

        expect(sermonAfter).not.toBe(sermonBefore);
        expect(sectionAfter).not.toBe(sectionBefore);
        expect(sectionAfter.blocks).toHaveLength(2);
        expect(sectionAfter.blocks[0]).toBe(canonicalSection.blocks[0]);
        expect(sectionAfter.blocks[1]).toBe(canonicalSection.blocks[1]);
        expect(sectionBefore.blocks).toHaveLength(1);
        expect(before.indices.has('p-1')).toBe(false);
        expect(after.indices.get('p-1')).toBe(3);
        expect(canonicalSection.blocks).toHaveLength(120);
    });

});
