import { afterEach, describe, expect, it } from 'vitest';
import { mount, unmount, tick } from 'svelte';
import type { NormalizedDocument } from '$lib/domains/normalized-content';
import { NormalizedContentRenderer } from '$lib/domains/normalized-content/ui';
import { NormalizedContentBlockWindow, type NormalizedContentBlockWindowChange } from '$lib/domains/normalized-content/modules/reader/runtime/normalized-content-block-window';

const mounted: ReturnType<typeof mount>[] = [];
const roots: HTMLElement[] = [];

afterEach(async () => {
    for (const component of mounted) await unmount(component);
    for (const root of roots) root.remove();
    mounted.length = 0;
    roots.length = 0;
});

describe('NormalizedContentRenderer nested canonical block window', () => {
    it('renders different windows of the same document in two independent panes', async () => {
        const source: NormalizedDocument = { blocks: [{
            type: 'quote', id: 'shared-section', blocks: [
                { type: 'paragraph', id: 'shared-first', content: [{ type: 'word', text: 'first' }] },
                { type: 'paragraph', id: 'shared-last', content: [{ type: 'word', text: 'last' }] }
            ]
        }] };
        const firstRoot = window.document.createElement('div');
        const secondRoot = window.document.createElement('div');
        window.document.body.append(firstRoot, secondRoot);
        roots.push(firstRoot, secondRoot);
        let firstProjection!: NormalizedContentBlockWindowChange;
        let secondProjection!: NormalizedContentBlockWindowChange;
        const firstWindow = new NormalizedContentBlockWindow((change) => { firstProjection = change; });
        const secondWindow = new NormalizedContentBlockWindow((change) => { secondProjection = change; });
        firstWindow.reset(source);
        secondWindow.reset(source);
        secondWindow.prepareIndex(1);
        mounted.push(mount(NormalizedContentRenderer, {
            target: firstRoot,
            props: { document: source, visibleBlocks: firstProjection.blocks, windowIndices: firstProjection.indices }
        }));
        mounted.push(mount(NormalizedContentRenderer, {
            target: secondRoot,
            props: { document: source, visibleBlocks: secondProjection.blocks, windowIndices: secondProjection.indices }
        }));
        await tick();
        expect(firstRoot.querySelector('#shared-first')?.getAttribute('data-normalized-window-index')).toBe('1');
        expect(firstRoot.querySelector('#shared-last')).toBeNull();
        expect(secondRoot.querySelector('#shared-first')).toBeNull();
        expect(secondRoot.querySelector('#shared-last')?.getAttribute('data-normalized-window-index')).toBe('2');
        expect(firstRoot.querySelector('#shared-section')).not.toBeNull();
        expect(secondRoot.querySelector('#shared-section')).not.toBeNull();
        expect(source.blocks[0] && 'blocks' in source.blocks[0] && source.blocks[0].blocks).toHaveLength(2);
    });

    it('mounts only selected nested leaves with their list ancestors and stable word indices', async () => {
        const document: NormalizedDocument = { blocks: [{
            type: 'list', id: 'list', ordered: false, blocks: [
                { type: 'list-item', id: 'item', blocks: Array.from({ length: 30 }, (_, i) => ({
                    type: 'paragraph' as const, id: `p-${i}`, content: [{ type: 'word' as const, text: `word-${i}` }]
                })) }
            ]
        }] };
        const root = window.document.createElement('div');
        window.document.body.append(root);
        roots.push(root);
        let current!: NormalizedContentBlockWindowChange;
        // Start directly at the 26th nested paragraph, without mounting its predecessors.
        const blockWindow = new NormalizedContentBlockWindow((next) => { current = next; });
        blockWindow.reset(document);
        blockWindow.prepareIndex(25);
        mounted.push(mount(NormalizedContentRenderer, {
            target: root,
            props: { document, visibleBlocks: current.blocks, windowIndices: current.indices }
        }));
        await tick();
        expect(root.querySelectorAll('ul > li > p')).toHaveLength(1);
        expect(root.querySelector('#p-0')).toBeNull();
        expect(root.querySelector('[data-normalized-window-index="26"]')?.id).toBe('p-25');
        expect(root.querySelector('#p-25 [data-normalized-content-index="0"]')).not.toBeNull();
    });
});
