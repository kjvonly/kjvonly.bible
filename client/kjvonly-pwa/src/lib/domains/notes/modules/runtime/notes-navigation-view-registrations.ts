import type {
	NavigationViewRegistration
} from '$lib/application';

import {
	NOTES_VIEWS,
	type NotesView
} from '../../models/notes-navigation.model';

import NotesContainer from '../notesContainer.svelte';

/**
 * Notes-owned navigation views registered by the application composition root.
 */
export const notesNavigationViewRegistrations:
	readonly NavigationViewRegistration<NotesView>[] = [
		{
			view: NOTES_VIEWS.ROOT,
			component: NotesContainer
		}
	];
