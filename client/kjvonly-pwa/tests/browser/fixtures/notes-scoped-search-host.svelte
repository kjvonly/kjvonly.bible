<script lang="ts">
	import {
		Modules,
		type ApplicationContext,
		type NavigationState
	} from '$lib/application';
	import {
		provideApplicationContext
	} from '$lib/application/runtime/application-context';
	import {
		provideNavigationEntryContext
	} from '$lib/application/runtime/navigation/navigation-entry-context';
	import {
		provideNavigationRuntimeContext
	} from '$lib/application/runtime/navigation/navigation-runtime-context';
	import {
		providePaneLayoutContext
	} from '$lib/application/runtime/pane/pane-layout-context';
	import Notes from '$lib/domains/notes/modules/notes.svelte';
	import {
		NOTES_VIEWS,
		type NotesNavigationIntent
	} from '$lib/domains/notes';

	let { applicationContext, navigationIntent }: {
		applicationContext: ApplicationContext;
		navigationIntent: NotesNavigationIntent;
	} = $props();

	const navigationState: NavigationState = {
		module: Modules.NOTES,
		view: NOTES_VIEWS.ROOT,
		state: {}
	};

	provideApplicationContext(applicationContext);
	providePaneLayoutContext({ clientHeight: 800, clientWidth: 400 });
	provideNavigationRuntimeContext({
		navigation: {
			back: () => {},
			pushView: () => {}
		} as never
	});
	provideNavigationEntryContext({
		navigationState,
		isActive: () => true,
		onResult: () => () => {},
		onActivation: () => () => {},
		whenActive: (callback) => { void callback(); return () => {}; },
		updateState: () => {},
		updateResourceSelection: () => {}
	});
</script>

<Notes {navigationIntent} {navigationState}></Notes>
