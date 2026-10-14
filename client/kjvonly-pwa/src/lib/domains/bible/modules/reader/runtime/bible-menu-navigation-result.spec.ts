import { describe, expect, it, vi } from 'vitest';
import type { PaneNavigation } from '$lib/application';
import { Modules } from '$lib/application';
import { BOOKMARKS_VIEWS } from '$lib/domains/bookmarks';
import {
    BIBLE_MENU_ACTIONS,
    BIBLE_NAVIGATION_RESULTS
} from '../../../models/bible-navigation.model';
import { handleBibleMenuNavigationResult } from './bible-menu-navigation-result';

describe('Bible More actions — Browse Bookmarks', () => {
    it('opens a Reader-returning Bookmarks list only after the Reader becomes active', () => {
        const pushModule = vi.fn();
        let activate: (() => void) | undefined;
        const handled = handleBibleMenuNavigationResult({
            type: BIBLE_NAVIGATION_RESULTS.MENU_ACTION,
            action: BIBLE_MENU_ACTIONS.BROWSE_BOOKMARKS
        }, {
            bibleLocationRef: '43_3_16_7',
            navigation: { pushModule } as unknown as PaneNavigation,
            whenActive: (callback) => {
                activate = callback;
                return () => {};
            }
        });

        expect(handled).toBe(true);
        expect(pushModule).not.toHaveBeenCalled();
        expect(activate).toBeDefined();
        activate?.();
        expect(pushModule).toHaveBeenCalledWith(
            Modules.BOOKMARKS,
            BOOKMARKS_VIEWS.ROOT,
            { returnBibleLocationToReader: true }
        );
    });

    it('does not accept unknown menu results', () => {
        expect(handleBibleMenuNavigationResult({
            type: BIBLE_NAVIGATION_RESULTS.MENU_ACTION,
            action: 'unknown'
        }, {
            bibleLocationRef: '43_3_16_0',
            navigation: {} as PaneNavigation,
            whenActive: () => { throw new Error('unexpected activation'); }
        })).toBe(false);
    });
});
