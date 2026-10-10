<script lang="ts">
	// ================================ IMPORTS ================================
	import {
		KJVBackButton
	} from '$lib/application/ui';

	// APPLICATION
	import {
		useNavigationRuntimeContext,
		usePaneLayoutContext
	} from '$lib/application';

	// COMPONENTS
	import {
		KJVMenuView,
		type HeaderActions,
		type KJVMenuAction
	} from '$lib/components';

	// MODELS
	import {
		BIBLE_MENU_ACTIONS,
		BIBLE_NAVIGATION_RESULTS,
		type BibleMenuAction
	} from '../../../models/bible-navigation.model';

	const {
		navigation
	} = useNavigationRuntimeContext();

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
		}
	];

	const headerActions: HeaderActions = [
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
	];

	/**
	 * Returns the selected menu action to the owning Bible reader.
	 *
	 * The menu does not manipulate sibling stack entries itself. The reader
	 * interprets the action after this menu entry is popped.
	 */
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

This view is intentionally a result-producing child of the Reader rather than
an owner of Reader navigation. Selecting an action pops the menu with a typed
Bible menu result; the owning Reader decides whether that result opens another
view, splits the pane, or changes Reader state.
-->

{#snippet leadingContent()}
	<KJVBackButton></KJVBackButton>
{/snippet}

<KJVMenuView
	title="More actions"
	{clientHeight}
	{actions}
	{headerActions}
	{leadingContent}
	{onAction}
></KJVMenuView>
