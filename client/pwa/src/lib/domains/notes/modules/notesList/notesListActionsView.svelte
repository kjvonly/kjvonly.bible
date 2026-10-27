<script lang="ts">
	// ================================ IMPORTS ================================
	// APPLICATION
	import {
		useNavigationRuntimeContext,
		usePaneLayoutContext
	} from '$lib/application';
	import {
		KJVBackButton
	} from '$lib/application/ui';

	// COMPONENTS
	import {
		KJVMenuView,
		type KJVMenuAction
	} from '$lib/components';

	// MODELS
	import {
		NOTES_LIST_ACTIONS,
		NOTES_NAVIGATION_RESULTS,
		type NotesListAction
	} from '../../models/notes-navigation.model';

	// ================================= VARS ==================================

	const paneLayout = usePaneLayoutContext();
	let clientHeight = $derived(
		paneLayout.clientHeight
	);

	const {
		navigation
	} = useNavigationRuntimeContext();

	const actions:
		readonly KJVMenuAction<NotesListAction>[] = [
			{
				label: 'Export filtered notes',
				value:
					NOTES_LIST_ACTIONS.EXPORT_FILTERED
			},
			{
				label: 'Split vertical',
				value:
					NOTES_LIST_ACTIONS.SPLIT_VERTICAL
			},
			{
				label: 'Split horizontal',
				value:
					NOTES_LIST_ACTIONS.SPLIT_HORIZONTAL
			}
		];

	// ================================ FUNCS ==================================

	async function onAction(
		action: NotesListAction
	): Promise<void> {
		await navigation.backWithResult({
			type:
				NOTES_NAVIGATION_RESULTS.LIST_ACTION,
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
