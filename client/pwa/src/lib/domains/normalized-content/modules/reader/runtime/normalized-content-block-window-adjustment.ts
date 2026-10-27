/** Window boundaries are zero-based; rendered leaf positions and anchors are one-based. */
export interface NormalizedBlockWindowRange {
    readonly start: number;
    readonly end: number;
    readonly total: number;
}

export interface NormalizedBlockWindowViewport {
    readonly top: number;
    readonly bottom: number;
    readonly height: number;
    readonly scrollTop: number;
}

export interface NormalizedBlockWindowLeafBounds {
    readonly top: number;
    readonly bottom: number;
}

export type NormalizedBlockWindowAdjustment =
    | { readonly kind: 'append' | 'removeLast' }
    | { readonly kind: 'prepend' | 'removeFirst'; readonly anchorPosition: number }
    | { readonly kind: 'none' };

/**
 * Selects a single window adjustment using the existing height-driven buffer
 * thresholds. Leaf bounds are requested lazily: reading unnecessary geometry
 * during each DOM update can force additional browser layout work.
 *
 * This function only decides what to do; the scroll adapter owns DOM access,
 * mutations, Svelte commits, and scroll-anchor restoration.
 */
export function determineNormalizedBlockWindowAdjustment(
    range: NormalizedBlockWindowRange,
    viewport: NormalizedBlockWindowViewport,
    measureLeaf: (oneBasedPosition: number) => NormalizedBlockWindowLeafBounds | undefined
): NormalizedBlockWindowAdjustment {
    const { start, end, total } = range;
    const { top, bottom, height, scrollTop } = viewport;
    if (!total || start >= end || height <= 0) {
        return { kind: 'none' };
    }

    const last = measureLeaf(end);
    if (!last) {
        return { kind: 'none' };
    }
    const spaceBelow = last.bottom - bottom;
    const atInitialTop = start === 0 && scrollTop < 1;
    if (end < total && spaceBelow < (atInitialTop ? 2 * height : height / 2)) {
        return { kind: 'append' };
    }

    const first = measureLeaf(start + 1);
    if (!first) {
        return { kind: 'none' };
    }
    const spaceAbove = top - first.top;
    if (start > 0 && spaceAbove < height / 2) {
        return { kind: 'prepend', anchorPosition: start + 1 };
    }

    if (end - start > 1 && spaceAbove > height) {
        const second = measureLeaf(start + 2);
        if (second && second.bottom < top - height) {
            return { kind: 'removeFirst', anchorPosition: start + 2 };
        }
    }

    if (!atInitialTop && end - start > 1 && spaceBelow > height) {
        const secondLast = measureLeaf(end - 1);
        if (secondLast && secondLast.top > bottom + height) {
            return { kind: 'removeLast' };
        }
    }

    return { kind: 'none' };
}
