<script lang="ts">
	import type {
		NavigationState
	} from '$lib/application';
	import {
		Modules
	} from '$lib/application';
	import Notes from './notes.svelte';
	import { NOTES_VIEWS } from '../models/notes-navigation.model';

	let {
		obj = {}
	}: {
		obj?: Record<string, unknown>;
	} = $props();

	const navigationState =
		getNavigationState(obj);

	const bibleLocationRef =
		navigationState.state
			.bibleLocationRef as
				string | undefined;

	const noteID =
		navigationState.state.noteID ??
		'';

	function getNavigationState(
		value: Record<string, unknown>
	): NotesNavigationState {
		const state = value.navigationState;

		if (
			!isRecord(state) ||
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

		return state as NotesNavigationState;
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

<!--
	Notes owns its BufferContainer in Note/NotesList so the navigation root
	can switch between the list and editor without changing shell ownership.
	Unlike most module containers, this wrapper must also remain unclipped so
	the child BufferContainer outline can render normally.
-->
<div class="kjvonly-noselect h-full w-full min-h-0 min-w-0">
	<Notes
		{bibleLocationRef}
		noteIDToOpen={noteID}
		{navigationState}
	></Notes>
</div>
