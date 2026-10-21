/** The original screen position of a surviving, one-based rendered leaf. */
export interface NormalizedBlockWindowScrollAnchor {
    readonly position: number;
    readonly top: number;
}

/** Capture the anchor before changing the rendered range. No DOM traversal is owned here. */
export function captureNormalizedBlockWindowScrollAnchor(
    position: number,
    measureTop: (position: number) => number | undefined
): NormalizedBlockWindowScrollAnchor | undefined {
    const top = measureTop(position);
    return top === undefined ? undefined : { position, top };
}

/**
 * Compare the surviving anchor after a DOM commit with its original position.
 * Missing anchors cannot be restored; a zero delta requires no scroll event.
 */
export function calculateNormalizedBlockWindowAnchorScrollDelta(
    anchor: NormalizedBlockWindowScrollAnchor,
    measureTop: (position: number) => number | undefined
): number | undefined {
    const currentTop = measureTop(anchor.position);
    return currentTop === undefined ? undefined : currentTop - anchor.top;
}
