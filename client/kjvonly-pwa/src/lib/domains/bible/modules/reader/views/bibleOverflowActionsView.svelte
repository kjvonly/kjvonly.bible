<script lang="ts">
	// ================================ IMPORTS ================================

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

	function onBack(): void {
		navigation.back();
	}
</script>

<KJVMenuView
	title="More actions"
	{clientHeight}
	{actions}
	{headerActions}
	{onBack}
	{onAction}
></KJVMenuView>
