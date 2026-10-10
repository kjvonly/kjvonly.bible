<script lang="ts">
	import {
		Modules,
		type NavigationState,
		useNavigationEntryContext
	} from '$lib/application';
	import Notes from './notes.svelte';
	import {
		NOTES_VIEWS,
		parseNotesNavigationIntent,
		type NotesNavigationIntent
	} from '../models/notes-navigation.model';

	const {
		navigationState
	} = useNavigationEntryContext();

	const navigationIntent =
		readNavigationIntent(
			navigationState
		);

	const {
		bibleScope,
		createBibleLocationRef
	} = navigationIntent;

	const noteID =
		navigationIntent.noteID ??
		'';

	function readNavigationIntent(
		state: NavigationState
	): NotesNavigationIntent {
		if (
			state.module !== Modules.NOTES ||
			state.view !== NOTES_VIEWS.ROOT
		) {
			throw new Error(
				'Invalid Notes navigation state'
			);
		}

		return parseNotesNavigationIntent(
			state.state
		);
	}
</script>

<!-- PaneNavigationContainer owns the presentation shell. -->
<div class="kjvonly-noselect h-full w-full min-h-0 min-w-0">
	<Notes
		{bibleScope}
		{createBibleLocationRef}
		noteIDToOpen={noteID}
		{navigationState}
	></Notes>
</div>
