<script lang="ts">
	import { onMount } from 'svelte';
	import uuid4 from 'uuid4';
	import {
		useApplicationContext,
		useNavigationRuntimeContext,
		usePaneLayoutContext
	} from '$lib/application';
	import {
		KJVBackButton
	} from '$lib/application/ui';
	import {
		KJVMenuView,
		type HeaderActions,
		type KJVMenuAction
	} from '$lib/components';
	import NoteStack from '$lib/components/svgs/noteStack.svelte';
	import BookmarkStack from '$lib/components/svgs/bookmarkStack.svelte';
	import {
		NORMALIZED_CONTENT_NAVIGATION_RESULTS,
		NORMALIZED_CONTENT_OVERFLOW_ACTIONS,
		type NormalizedContentOverflowAction
	} from '../../../models/normalized-content-navigation.model';

	const { navigation } = useNavigationRuntimeContext();
	const { settingsService } = useApplicationContext();
	const settingsSubscriberID = uuid4();
	let isDarkTheme = $state(settingsService.getSettings().isDarkTheme);

	onMount(() => {
		settingsService.subscribe(settingsSubscriberID, (settings) => {
			isDarkTheme = settings.isDarkTheme;
		});
		isDarkTheme = settingsService.getSettings().isDarkTheme;
		return () => settingsService.unsubscribe(settingsSubscriberID);
	});

	const paneLayout = usePaneLayoutContext();
	let clientHeight = $derived(paneLayout.clientHeight);

	/** Reader actions return to the still-mounted Reader for interpretation. */
	const actions: readonly KJVMenuAction<NormalizedContentOverflowAction>[] = [
		{ label: 'Open document notes', value: NORMALIZED_CONTENT_OVERFLOW_ACTIONS.OPEN_DOCUMENT_NOTES },
		{ label: 'Browse document bookmarks', value: NORMALIZED_CONTENT_OVERFLOW_ACTIONS.BROWSE_DOCUMENT_BOOKMARKS }
	];

	// Match the Bible Reader's theme toggle and split controls.
	const headerActions = $derived.by((): HeaderActions => [
		{
			icon: isDarkTheme ? 'light-mode' : 'dark-mode',
			label: isDarkTheme ? 'Light mode' : 'Night mode',
			onClick: toggleTheme
		},
		{
			icon: 'split-horizontal',
			label: 'Split pane horizontally',
			onClick: () => void onAction(
				NORMALIZED_CONTENT_OVERFLOW_ACTIONS.SPLIT_HORIZONTAL
			)
		},
		{
			icon: 'split-vertical',
			label: 'Split pane vertically',
			onClick: () => void onAction(
				NORMALIZED_CONTENT_OVERFLOW_ACTIONS.SPLIT_VERTICAL
			)
		}
	]);

	/** Toggles the shared application theme without leaving More actions. */
	function toggleTheme(): void {
		settingsService.updateSetting(
			'isDarkTheme',
			!settingsService.getSettings().isDarkTheme
		);
	}

	/** Returns the command to the mounted Reader after popping this menu. */
	async function onAction(action: NormalizedContentOverflowAction): Promise<void> {
		await navigation.backWithResult({
			type: NORMALIZED_CONTENT_NAVIGATION_RESULTS.OVERFLOW_ACTION,
			action
		});
	}
</script>

{#snippet actionIcon(action: NormalizedContentOverflowAction)}
	{#if action === NORMALIZED_CONTENT_OVERFLOW_ACTIONS.OPEN_DOCUMENT_NOTES}
		<NoteStack classes="h-5 w-5 shrink-0" />
	{:else if action === NORMALIZED_CONTENT_OVERFLOW_ACTIONS.BROWSE_DOCUMENT_BOOKMARKS}
		<BookmarkStack classes="h-5 w-5 shrink-0" />
	{/if}
{/snippet}

{#snippet leadingContent()}
	<KJVBackButton></KJVBackButton>
{/snippet}

<KJVMenuView
	title="More actions"
	{clientHeight}
	{actions}
	{headerActions}
	{leadingContent}
	{actionIcon}
	{onAction}
></KJVMenuView>
