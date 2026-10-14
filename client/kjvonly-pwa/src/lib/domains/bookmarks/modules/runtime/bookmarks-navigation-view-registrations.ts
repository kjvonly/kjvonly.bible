import type { NavigationViewRegistration } from '$lib/application';
import { BOOKMARKS_VIEWS, type BookmarksView } from '../../models/bookmarks-navigation.model';
import Bookmarks from '../bookmarks.svelte';
import BookmarkRelocationConfirmation from '../bookmarkRelocationConfirmation.svelte';
import BookmarkDeleteConfirmation from '../bookmarkDeleteConfirmation.svelte';
import BookmarksActionsView from '../bookmarksActionsView.svelte';

/** Browser-only Bookmarks navigation contribution. */
export const bookmarksNavigationViewRegistrations:
    readonly NavigationViewRegistration<BookmarksView>[] = [
        { view: BOOKMARKS_VIEWS.ROOT, component: Bookmarks },
        { view: BOOKMARKS_VIEWS.CONFIRM_RELOCATION, component: BookmarkRelocationConfirmation },
        { view: BOOKMARKS_VIEWS.CONFIRM_DELETE, component: BookmarkDeleteConfirmation },
        { view: BOOKMARKS_VIEWS.ACTIONS, component: BookmarksActionsView }
    ];
