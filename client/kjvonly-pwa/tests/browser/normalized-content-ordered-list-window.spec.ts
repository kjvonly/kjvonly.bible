import { afterEach, describe, expect, it } from 'vitest';
import { mount, tick, unmount } from 'svelte';
import type { NormalizedDocument } from '@kjvonly/normalized-content';
import { NormalizedContentRenderer } from '$lib/domains/normalized-content/ui';
import {
    NormalizedContentBlockWindow,
    type NormalizedContentBlockWindowChange
} from '$lib/domains/normalized-content/modules/reader/runtime/normalized-content-block-window';

const mounted: ReturnType<typeof mount>[] = [];
const roots: HTMLElement[] = [];

afterEach(async () => {
    for (const component of mounted) await unmount(component);
    for (const root of roots) root.remove();
    mounted.length = 0;
    roots.length = 0;
});

describe('Ordered lists in a nested Reader window', () => {
    it('uses original ordinals for visible items in both outer and nested lists', async () => {
        const paragraph = (id: string) => ({
            type: 'paragraph' as const, id, content: [{ type: 'word' as const, text: id }]
        });
        const document: NormalizedDocument = { blocks: [{
            type: 'list', id: 'outer', ordered: true, blocks: Array.from({ length: 7 }, (_, i) => ({
                type: 'list-item' as const, id: `item-${i + 1}`,
                blocks: i === 6
                    ? [{ type: 'list' as const, id: 'inner', ordered: true, blocks: [
                        { type: 'list-item' as const, id: 'inner-1', blocks: [paragraph('inner-p-1')] },
                        { type: 'list-item' as const, id: 'inner-2', blocks: [paragraph('inner-p-2')] }
                    ] }]
                    : [paragraph(`p-${i + 1}`)]
            }))
        }] };
        let projection!: NormalizedContentBlockWindowChange;
        const window = new NormalizedContentBlockWindow((change) => { projection = change; });
        window.reset(document);
        window.prepareIndex(window.findBlockIndex('inner-p-2')!);

        const root = globalThis.document.createElement('div');
        globalThis.document.body.append(root);
        roots.push(root);
        mounted.push(mount(NormalizedContentRenderer, {
            target: root,
            props: {
                document,
                visibleBlocks: projection.blocks,
                windowIndices: projection.indices,
                orderedListStarts: projection.orderedListStarts
            }
        }));
        await tick();

        expect(root.querySelector('ol#outer')?.getAttribute('start')).toBe('7');
        expect(root.querySelector('ol#inner')?.getAttribute('start')).toBe('2');
        expect(root.querySelectorAll('ol#outer > li')).toHaveLength(1);
        expect(root.querySelectorAll('ol#inner > li')).toHaveLength(1);
        expect(root.querySelector('#inner-p-1')).toBeNull();
        expect(root.querySelector('#inner-p-2')).not.toBeNull();
        expect(document.blocks[0] && 'blocks' in document.blocks[0] && document.blocks[0].blocks)
            .toHaveLength(7);
    });
});
