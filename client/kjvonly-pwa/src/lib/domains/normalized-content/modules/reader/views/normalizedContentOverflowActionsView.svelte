<script lang="ts">
	import {
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
	import {
		NORMALIZED_CONTENT_NAVIGATION_RESULTS,
		NORMALIZED_CONTENT_OVERFLOW_ACTIONS,
		type NormalizedContentOverflowAction
	} from '../../../models/normalized-content-navigation.model';

	const { navigation } = useNavigationRuntimeContext();
	const paneLayout = usePaneLayoutContext();
	let clientHeight = $derived(paneLayout.clientHeight);

	/** Reader actions return to the still-mounted Reader for interpretation. */
	const actions: readonly KJVMenuAction<NormalizedContentOverflowAction>[] = [
		{ label: 'Browse document bookmarks', value: NORMALIZED_CONTENT_OVERFLOW_ACTIONS.BROWSE_DOCUMENT_BOOKMARKS }
	];

	// Match the Bible Reader's shared split controls above the action list.
	const headerActions: HeaderActions = [
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
	];

	/** Returns the command to the mounted Reader after popping this menu. */
	async function onAction(action: NormalizedContentOverflowAction): Promise<void> {
		await navigation.backWithResult({
			type: NORMALIZED_CONTENT_NAVIGATION_RESULTS.OVERFLOW_ACTION,
			action
		});
	}
</script>

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
