import type { NormalizedBlock, NormalizedDocument } from '@kjvonly/normalized-content';

interface SubtreeSpan { readonly start: number; readonly end: number }

/** The Reader can mount any nested leaf while retaining its semantic ancestors. */
export interface NormalizedContentBlockWindowChange {
    readonly blocks: readonly NormalizedBlock[];
    /** One-based DOM positions for rendered leaf IDs (not canonical indices). */
    readonly indices: ReadonlyMap<string, number>;
    /** HTML start values for ordered lists whose preceding items are unmounted. */
    readonly orderedListStarts: ReadonlyMap<string, number>;
    readonly start: number;
    readonly end: number;
    readonly total: number;
}

/**
 * Windows canonical renderable blocks at any nesting depth without changing
 * document identity, IDs, inline indices, or the original tree. Structural
 * ancestors are projected only when one of their descendants is visible.
 *
 * Window ranges and navigation target indices are zero-based; the range end
 * is exclusive. Rendered leaf positions exposed to the DOM are one-based.
 */
export class NormalizedContentBlockWindow {
    private source: NormalizedDocument | undefined;
    private leaves: NormalizedBlock[] = [];
    private readonly spans = new WeakMap<NormalizedBlock, SubtreeSpan>();
    /** Includes block IDs and inline anchor IDs, both mapped to leaf indices. */
    private readonly leafIndexByTargetId = new Map<string, number>();
    private start = 0;
    private end = 0;
    // Reset and explicit jumps invalidate async reconciliation of an older window.
    private generation = 0;

    constructor(private readonly onChange: (change: NormalizedContentBlockWindowChange) => void) {}

    /** Zero-based [start, end) leaf window, with total canonical leaves. */
    getRange(): { start: number; end: number; total: number } {
        return { start: this.start, end: this.end, total: this.leaves.length };
    }

    /** Changes only for a new document or an explicit navigation jump. */
    getGeneration(): number {
        return this.generation;
    }

    /** Returns the canonical DOM ID for a one-based leaf position. */
    getLeafId(oneBasedPosition: number): string | undefined {
        return this.leaves[oneBasedPosition - 1]?.id;
    }

    /** Invalidates the previous document window and builds a DFS leaf index. */
    reset(document?: NormalizedDocument): void {
        this.generation++;
        this.source = document;
        this.leaves = [];
        this.leafIndexByTargetId.clear();
        for (const block of document?.blocks ?? []) this.indexBlockSubtreeAndTargets(block);
        this.start = 0;
        this.end = Math.min(1, this.leaves.length);
        this.publishWindowProjection();
    }

    /** Adds exactly one canonical leaf at the lower edge. */
    append(): boolean {
        if (this.end >= this.leaves.length) {
            return false;
        }
        this.end++;
        this.publishWindowProjection();
        return true;
    }

    /** Adds exactly one canonical leaf at the upper edge. */
    prepend(): boolean {
        if (this.start === 0) {
            return false;
        }
        this.start--;
        this.publishWindowProjection();
        return true;
    }

    /** Removes exactly one leaf; callers must first verify its rendered bounds. */
    removeFirst(): boolean {
        if (this.end - this.start <= 1) {
            return false;
        }
        this.start++;
        this.publishWindowProjection();
        return true;
    }

    /** Removes the last visible leaf, retaining at least one for scroll anchoring. */
    removeLast(): boolean {
        if (this.end - this.start <= 1) {
            return false;
        }
        this.end--;
        this.publishWindowProjection();
        return true;
    }

    /** Jump to a zero-based leaf index, including one nested in a container. */
    prepareIndex(zeroBasedIndex: number): boolean {
        if (!Number.isInteger(zeroBasedIndex) || zeroBasedIndex < 0 || zeroBasedIndex >= this.leaves.length) {
            return false;
        }
        this.generation++;
        this.start = zeroBasedIndex;
        this.end = zeroBasedIndex + 1;
        this.publishWindowProjection();
        return true;
    }

    /** Resolve a block/anchor ID to its zero-based containing leaf index. */
    findBlockIndex(targetId: string): number | undefined {
        return this.leafIndexByTargetId.get(targetId);
    }

    /**
     * Index independently windowable blocks in document order.
     * A table row is one atomic unit: rendering only some cells would change
     * the meaning and layout of the table. Its descendants remain addressable.
     */
    private indexBlockSubtreeAndTargets(block: NormalizedBlock): SubtreeSpan {
        const start = this.leaves.length;
        if (block.type === 'table-row') {
            this.leaves.push(block);
            this.indexTargetsWithinAtomicRow(block, start);
        } else if ('blocks' in block && block.blocks.length) {
            for (const child of block.blocks) this.indexBlockSubtreeAndTargets(child);
        } else {
            this.leaves.push(block);
            if ('content' in block) {
                for (const part of block.content) {
                    if (part.type === 'anchor') this.leafIndexByTargetId.set(part.id, start);
                }
            }
        }
        this.leafIndexByTargetId.set(block.id, start);
        const span = { start, end: this.leaves.length };
        this.spans.set(block, span);
        return span;
    }

    /**
     * Map every descendant block and inline anchor to its containing row.
     * The row is mounted as a whole, so its cells remain valid jump targets
     * without becoming independent rendering-window boundaries.
     */
    private indexTargetsWithinAtomicRow(block: NormalizedBlock, rowIndex: number): void {
        this.leafIndexByTargetId.set(block.id, rowIndex);
        if ('content' in block) {
            for (const part of block.content) {
                if (part.type === 'anchor') this.leafIndexByTargetId.set(part.id, rowIndex);
            }
        }
        if ('blocks' in block) {
            for (const child of block.blocks) this.indexTargetsWithinAtomicRow(child, rowIndex);
        }
    }

    /** Publishes a complete new projection after a committed window change. */
    private publishWindowProjection(): void {
        this.onChange(this.buildVisibleWindowProjection());
    }

    /** Builds one render-only snapshot without modifying canonical blocks. */
    private buildVisibleWindowProjection(): NormalizedContentBlockWindowChange {
        const indices = new Map<string, number>();
        for (let n = this.start; n < this.end; n++) {
            const leaf = this.leaves[n];
            if (leaf) indices.set(leaf.id, n + 1);
        }
        const blocks: NormalizedBlock[] = [];
        const orderedListStarts = new Map<string, number>();
        for (const block of this.source?.blocks ?? []) {
            const projected = this.projectVisibleSubtree(block, orderedListStarts);
            if (projected) blocks.push(projected);
        }
        return { blocks, indices, orderedListStarts, start: this.start, end: this.end, total: this.leaves.length };
    }

    /** Reuse canonical leaves; shallow-copy only ancestor wrappers on screen. */
    private projectVisibleSubtree(
        block: NormalizedBlock,
        orderedListStarts: Map<string, number>
    ): NormalizedBlock | undefined {
        const span = this.spans.get(block);
        if (!span || span.end <= this.start || span.start >= this.end) {
            return;
        }
        // A row is one window unit. Preserve every cell and nested descendant.
        if (block.type === 'table-row') {
            return block;
        }
        if ('blocks' in block && block.blocks.length) {
            const children = block.blocks
                .map((child) => this.projectVisibleSubtree(child, orderedListStarts))
                .filter((child): child is NormalizedBlock => child !== undefined);
            if (block.type === 'list' && block.ordered && children.length) {
                // A projected <ol> needs the original ordinal of its first
                // visible <li>, rather than restarting numbering at one.
                const firstOrdinal = block.blocks.findIndex((child) => child.id === children[0].id) + 1;
                if (firstOrdinal > 1) orderedListStarts.set(block.id, firstOrdinal);
            }
            return { ...block, blocks: children } as NormalizedBlock;
        }
        return block;
    }
}
