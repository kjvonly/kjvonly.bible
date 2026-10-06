<script lang="ts">
	// APPLICATION UI
	import KJVBackButton from '../../../ui/navigation/KJVBackButton.svelte';

	// APPLICATION
	import {
		useNavigationRuntimeContext
	} from '../../../runtime/navigation/navigation-runtime-context';
	import {
		usePaneLayoutContext
	} from '../../../runtime/pane/pane-layout-context';

	// COMPONENTS
	import {
		KJVMenuView,
		type KJVMenuAction
	} from '$lib/components';

	// MODELS
	import {
		FILE_MANAGER_NAVIGATION_RESULTS,
		FILE_MANAGER_OVERFLOW_ACTIONS,
		type FileManagerOverflowAction
	} from '../models/file-manager-navigation.model';

	const paneLayout =
		usePaneLayoutContext();
	let clientHeight = $derived(
		paneLayout.clientHeight
	);

	const {
		navigation
	} = useNavigationRuntimeContext();

	const actions:
		readonly KJVMenuAction<FileManagerOverflowAction>[] = [
			{
				label: 'Split horizontally',
				value:
					FILE_MANAGER_OVERFLOW_ACTIONS.SPLIT_HORIZONTAL
			},
			{
				label: 'Split vertically',
				value:
					FILE_MANAGER_OVERFLOW_ACTIONS.SPLIT_VERTICAL
			}
		];

	/** Returns the selected command to the mounted FileManager view beneath this menu. */
	async function onAction(
		action: FileManagerOverflowAction
	): Promise<void> {
		await navigation.backWithResult({
			type:
				FILE_MANAGER_NAVIGATION_RESULTS.OVERFLOW_ACTION,
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
	{leadingContent}
	{onAction}
></KJVMenuView>
