import { describe, expect, it, vi } from 'vitest';
import type { Component } from 'svelte';
import { get } from 'svelte/store';
import {
    BOOKMARKS_VIEWS,
    createBookmarkBrowseNavigationResult,
    createBookmarkRelocationCompletedResult,
    parseBookmarkBrowseNavigationResult,
    parseBookmarkRelocationCompletedResult
} from '$lib/domains/bookmarks';
import { BIBLE_VIEWS } from '$lib/domains/bible';
import { BIBLE_MENU_ACTIONS, BIBLE_NAVIGATION_RESULTS } from '../../domains/bible/models/bible-navigation.model';
import { handleBibleMenuNavigationResult } from '../../domains/bible/modules/reader/runtime/bible-menu-navigation-result';
import { Modules } from '../models/modules.model';
import { NavigationViewRegistry } from '../runtime/rendering/navigation-view-registry';
import { NavigationViewResolver } from '../runtime/rendering/navigation-view-resolver';
import { NavigationStateBuilder } from './navigation-state-builder';
import { NavigationService, type NavigationState } from './navigation.service';
import { PaneNavigationService } from './pane-navigation.service';

const MockView = (() => undefined) as unknown as Component;
const SOURCE = { publisher: 'publisher', resourceId: 'bible/chapters' };
const ORIGINAL = '43_3_16_0';
const DESTINATION = '43_4_12_7';

/** Use the real Pane navigation stack, with independent state and handlers per Pane. */
function createPane(paneID: string): PaneNavigationService {
    const registry = new NavigationViewRegistry();
    registry.registerAll([
        { view: 'modules.root', component: MockView },
        { view: BIBLE_VIEWS.READER, component: MockView },
        { view: BIBLE_VIEWS.OVERFLOW_ACTIONS, component: MockView },
        { view: BOOKMARKS_VIEWS.ROOT, component: MockView },
        { view: BOOKMARKS_VIEWS.CONFIRM_RELOCATION, component: MockView }
    ]);
    const selections = {
        independent: () => ({ 'bible/chapters': SOURCE }),
        related: (_module: Modules, inherited: Record<string, typeof SOURCE>) => inherited,
        update: (_module: Modules, inherited: Record<string, typeof SOURCE>) => inherited
    };
    return new PaneNavigationService(
        paneID,
        new NavigationService(),
        new NavigationStateBuilder(selections),
        new NavigationViewResolver(registry),
        selections
    );
}

/** Mirrors the mounted NavigationEntryContext's deferred activation contract. */
function whenActive(
    navigation: PaneNavigationService,
    state: NavigationState,
    handler: () => void | Promise<void>
): void {
    const active = () => get(navigation.views).at(-1)?.navigationState === state;
    if (active()) {
        void handler();
        return;
    }
    const unsubscribe = navigation.views.subscribe(() => {
        if (!active()) return;
        unsubscribe();
        void handler();
    });
}

function stack(navigation: PaneNavigationService): readonly NavigationState[] {
    return get(navigation.views).map((view) => view.navigationState);
}

/** Register the same Reader-owned result behavior used by bibleContainer.svelte. */
function registerReader(
    navigation: PaneNavigationService,
    reader: NavigationState,
    onLocation: (ref: string) => void
): void {
    navigation.onResult(reader, (result) => {
        if (handleBibleMenuNavigationResult(result, {
            bibleLocationRef: ORIGINAL,
            navigation,
            whenActive: (callback) => {
                whenActive(navigation, reader, callback);
                return () => undefined;
            }
        })) return;
        const bookmark = parseBookmarkBrowseNavigationResult(result);
        if (bookmark) {
            whenActive(navigation, reader, () => onLocation(bookmark.bibleLocationRef));
        }
    });
}

/** A completed confirmation is forwarded only after its Bookmarks list becomes active. */
function registerRelocationList(navigation: PaneNavigationService, list: NavigationState): void {
    navigation.onResult(list, (result) => {
        const completed = parseBookmarkRelocationCompletedResult(result);
        if (!completed) return;
        whenActive(navigation, list, () => navigation.backWithResult(
            createBookmarkBrowseNavigationResult(completed.bibleLocationRef)
        ));
    });
}

async function settleNavigation(): Promise<void> {
    // Result forwarding schedules another backWithResult after the confirmation pop.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
}

describe('Bookmarks navigation on mounted Pane stacks', () => {
    it('returns Browse from More actions to the original Reader, without pushing another Reader', async () => {
        const navigation = createPane('pane-a');
        navigation.pushModule(Modules.MODULES, 'modules.root', {});
        const reader = navigation.pushModule(Modules.BIBLE, BIBLE_VIEWS.READER, {
            bibleLocationRef: ORIGINAL
        });
        const onLocation = vi.fn();
        registerReader(navigation, reader, onLocation);

        // More reports its action, then the Reader opens Bookmarks once active.
        navigation.pushView(BIBLE_VIEWS.OVERFLOW_ACTIONS, {});
        await navigation.backWithResult({
            type: BIBLE_NAVIGATION_RESULTS.MENU_ACTION,
            action: BIBLE_MENU_ACTIONS.BROWSE_BOOKMARKS
        });
        const list = stack(navigation).at(-1);
        expect(list?.view).toBe(BOOKMARKS_VIEWS.ROOT);
        expect(list?.state.returnBibleLocationToReader).toBe(true);

        await navigation.backWithResult(createBookmarkBrowseNavigationResult(DESTINATION));
        await settleNavigation();
        expect(onLocation).toHaveBeenCalledTimes(1);
        expect(onLocation).toHaveBeenCalledWith(DESTINATION);
        expect(stack(navigation).at(-1)).toBe(reader);
        expect(stack(navigation).filter((view) => view.view === BIBLE_VIEWS.READER)).toHaveLength(1);
        expect(reader.state.resourceSelections).toEqual({ 'bible/chapters': SOURCE });
    });

    it('forwards successful relocation through its Bookmarks list to the original Reader', async () => {
        const navigation = createPane('pane-a');
        navigation.pushModule(Modules.MODULES, 'modules.root', {});
        const reader = navigation.pushModule(Modules.BIBLE, BIBLE_VIEWS.READER, {
            bibleLocationRef: ORIGINAL
        });
        const onLocation = vi.fn();
        registerReader(navigation, reader, onLocation);
        const list = navigation.pushModule(Modules.BOOKMARKS, BOOKMARKS_VIEWS.ROOT, {
            mode: 'relocate',
            destinationBibleLocationRef: DESTINATION,
            destinationPreviewText: 'Destination verse'
        });
        registerRelocationList(navigation, list);
        navigation.pushView(BOOKMARKS_VIEWS.CONFIRM_RELOCATION, {
            bookmarkId: 'publisher/default/123e4567-e89b-42d3-a456-426614174000',
            destinationBibleLocationRef: DESTINATION,
            destinationPreviewText: 'Destination verse'
        });

        await navigation.backWithResult(createBookmarkRelocationCompletedResult(DESTINATION));
        await settleNavigation();
        expect(onLocation).toHaveBeenCalledTimes(1);
        expect(onLocation).toHaveBeenCalledWith(DESTINATION);
        expect(stack(navigation).at(-1)).toBe(reader);
        expect(stack(navigation).filter((view) => view.view === BIBLE_VIEWS.READER)).toHaveLength(1);
    });

    it('leaves the Reader unchanged when the confirmation is cancelled', () => {
        const navigation = createPane('pane-a');
        navigation.pushModule(Modules.MODULES, 'modules.root', {});
        const reader = navigation.pushModule(Modules.BIBLE, BIBLE_VIEWS.READER, {});
        const onLocation = vi.fn();
        registerReader(navigation, reader, onLocation);
        const list = navigation.pushModule(Modules.BOOKMARKS, BOOKMARKS_VIEWS.ROOT, {
            mode: 'relocate',
            destinationBibleLocationRef: DESTINATION,
            destinationPreviewText: 'Destination verse'
        });
        registerRelocationList(navigation, list);
        navigation.pushView(BOOKMARKS_VIEWS.CONFIRM_RELOCATION, {});
        navigation.back();
        expect(stack(navigation).at(-1)).toBe(list);
        navigation.back();
        expect(stack(navigation).at(-1)).toBe(reader);
        expect(onLocation).not.toHaveBeenCalled();
    });

    it('never delivers a selection or relocation result to a different Pane', async () => {
        const first = createPane('pane-a');
        const second = createPane('pane-b');
        for (const navigation of [first, second]) {
            navigation.pushModule(Modules.MODULES, 'modules.root', {});
        }
        const firstReader = first.pushModule(Modules.BIBLE, BIBLE_VIEWS.READER, {});
        const secondReader = second.pushModule(Modules.BIBLE, BIBLE_VIEWS.READER, {});
        const firstLocation = vi.fn();
        const secondLocation = vi.fn();
        registerReader(first, firstReader, firstLocation);
        registerReader(second, secondReader, secondLocation);
        first.pushModule(Modules.BOOKMARKS, BOOKMARKS_VIEWS.ROOT, { returnBibleLocationToReader: true });
        const secondList = second.pushModule(Modules.BOOKMARKS, BOOKMARKS_VIEWS.ROOT, {
            mode: 'relocate', destinationBibleLocationRef: ORIGINAL,
            destinationPreviewText: 'Other pane'
        });

        await first.backWithResult(createBookmarkBrowseNavigationResult(DESTINATION));
        await settleNavigation();
        expect(firstLocation).toHaveBeenCalledTimes(1);
        expect(firstLocation).toHaveBeenCalledWith(DESTINATION);
        expect(secondLocation).not.toHaveBeenCalled();
        expect(stack(first).at(-1)).toBe(firstReader);
        expect(stack(second).at(-1)).toBe(secondList);
    });
});
