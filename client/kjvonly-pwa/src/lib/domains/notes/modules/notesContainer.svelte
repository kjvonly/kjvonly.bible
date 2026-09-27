<script lang="ts">
	import {
		Modules,
		type NavigationState,
		useNavigationEntryContext
	} from '$lib/application';
	import Notes from './notes.svelte';
	import { NOTES_VIEWS } from '../models/notes-navigation.model';

	const {
		navigationState
	} = useNavigationEntryContext();

	validateNavigationState(
		navigationState
	);

	const bibleLocationRef =
		navigationState.state
			.bibleLocationRef as
				string | undefined;

	const noteID =
		navigationState.state.noteID ??
		'';

	function validateNavigationState(
		state: NavigationState
	): asserts state is NotesNavigationState {
		if (
			state.module !== Modules.NOTES ||
			state.view !== NOTES_VIEWS.ROOT ||
			!isRecord(state.state)
		) {
			throw new Error(
				'Invalid Notes navigation state'
			);
		}

		if (
			state.state.noteID !== undefined &&
			typeof state.state.noteID !== 'string'
		) {
			throw new Error(
				'Invalid Notes note ID state'
			);
		}

		if (
			state.state.bibleLocationRef !== undefined &&
			typeof state.state.bibleLocationRef !== 'string'
		) {
			throw new Error(
				'Invalid Notes Bible location state'
			);
		}

	}

	function isRecord(
		value: unknown
	): value is Record<string, unknown> {
		return (
			typeof value === 'object' &&
			value !== null
		);
	}

	type NotesNavigationState =
		NavigationState<typeof NOTES_VIEWS.ROOT> & {
			state: NavigationState<
				typeof NOTES_VIEWS.ROOT
			>['state'] & {
				noteID?: string;
				bibleLocationRef?: string;
		};
	};
</script>

<!-- PaneNavigationContainer owns the presentation shell. -->
<div class="kjvonly-noselect h-full w-full min-h-0 min-w-0">
	<Notes
		{bibleLocationRef}
		noteIDToOpen={noteID}
		{navigationState}
	></Notes>
</div>
