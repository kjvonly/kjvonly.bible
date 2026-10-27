import type { NormalizedContentAddress } from '../../models/normalized-content-address.model';

/**
 * Locate one canonical word inside a mounted Reader, without CSS-escaping or
 * interpreting opaque block IDs as selectors. A nested block's word must not
 * be confused with a word in the enclosing block at the same content index.
 */
export function findNormalizedContentWordElement(
    root: HTMLElement,
    address: NormalizedContentAddress
): HTMLElement | undefined {
    const block = Array.from(root.querySelectorAll<HTMLElement>('[data-normalized-block]'))
        .find((element) => element.id === address.blockId);
    if (!block) return undefined;
    return Array.from(block.querySelectorAll<HTMLElement>('[data-normalized-content-kind="word"]'))
        .find((word) => word.dataset.normalizedContentIndex === String(address.contentIndex) &&
            word.closest('[data-normalized-block]') === block);
}
