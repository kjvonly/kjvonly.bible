<script lang="ts">
	// ================================ IMPORTS ================================
	import { onMount } from 'svelte';
	import uuid4 from 'uuid4';
	import {
		KJVBackButton
	} from '$lib/application/ui';

	// APPLICATION
	import {
		useApplicationContext,
		useNavigationRuntimeContext,
		usePaneLayoutContext
	} from '$lib/application';

	// COMPONENTS
	import {
		KJVMenuView,
		type HeaderActions,
		type KJVMenuAction
	} from '$lib/components';

	import BookmarkStack from '$lib/components/svgs/bookmarkStack.svelte';
	import Copy from '$lib/components/svgs/copy.svelte';
	import LibraryBooks from '$lib/components/svgs/libraryBooks.svelte';

	// MODELS
	import {
		BIBLE_MENU_ACTIONS,
		BIBLE_NAVIGATION_RESULTS,
		type BibleMenuAction
	} from '../../../models/bible-navigation.model';

	const {
		navigation
	} = useNavigationRuntimeContext();
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
	let clientHeight = $derived(
		paneLayout.clientHeight
	);

	const actions: readonly KJVMenuAction<BibleMenuAction>[] = [
		{
			label: 'Copy verses',
			value: BIBLE_MENU_ACTIONS.COPY_VERSES
		},
		{
			label: 'Bible version',
			value: BIBLE_MENU_ACTIONS.BIBLE_VERSION
		},
		{
			label: 'Browse bookmarks',
			value: BIBLE_MENU_ACTIONS.BROWSE_BOOKMARKS
		}
	];

	const headerActions = $derived.by((): HeaderActions => [
		{
			icon: isDarkTheme ? 'light-mode' : 'dark-mode',
			label: isDarkTheme ? 'Light mode' : 'Night mode',
			onClick: toggleTheme
		},
		{
			icon: 'split-horizontal',
			label: 'Split pane horizontally',
			onClick: () =>
				void onAction(BIBLE_MENU_ACTIONS.SPLIT_HORIZONTAL)
		},
		{
			icon: 'split-vertical',
			label: 'Split pane vertically',
			onClick: () =>
				void onAction(BIBLE_MENU_ACTIONS.SPLIT_VERTICAL)
		}
	]);

	/** Toggles the shared application theme without leaving More actions. */
	function toggleTheme(): void {
		settingsService.updateSetting(
			'isDarkTheme',
			!settingsService.getSettings().isDarkTheme
		);
	}

	/** Returns Reader actions to the owning Reader through backWithResult(). */
	async function onAction(
		action: BibleMenuAction
	): Promise<void> {
		await navigation.backWithResult({
			type:
				BIBLE_NAVIGATION_RESULTS.MENU_ACTION,
			action
		});
	}
</script>

<!--
@component
Bible Reader overflow menu.

This view is a child of the Reader rather than an owner of Reader navigation.
Reader actions return typed results to the owning Reader; the header's
application-wide theme toggle applies in place without popping the menu.
-->

{#snippet actionIcon(action: BibleMenuAction)}
	{#if action === BIBLE_MENU_ACTIONS.COPY_VERSES}
		<Copy classes="h-5 w-5 shrink-0" />
	{:else if action === BIBLE_MENU_ACTIONS.BIBLE_VERSION}
		<LibraryBooks classes="h-5 w-5 shrink-0" />
	{:else if action === BIBLE_MENU_ACTIONS.BROWSE_BOOKMARKS}
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
