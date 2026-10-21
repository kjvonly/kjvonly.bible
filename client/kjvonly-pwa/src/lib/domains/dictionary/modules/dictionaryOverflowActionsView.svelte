<script lang="ts">
	import { useNavigationRuntimeContext, usePaneLayoutContext } from '$lib/application';
	import { KJVBackButton } from '$lib/application/ui';
	import { KJVMenuView, type HeaderActions, type KJVMenuAction } from '$lib/components';
	import DictionaryIcon from '$lib/components/svgs/dictionary.svelte';
	import {
		DICTIONARY_OVERFLOW_ACTIONS,
		createDictionaryOverflowActionResult,
		type DictionaryOverflowAction
	} from '../models/dictionary-navigation.model';

	const { navigation } = useNavigationRuntimeContext();
	const paneLayout = usePaneLayoutContext();
	const clientHeight = $derived(paneLayout.clientHeight);

	const actions: readonly KJVMenuAction<DictionaryOverflowAction>[] = [
		{ label: 'Dictionary versions', value: DICTIONARY_OVERFLOW_ACTIONS.VERSIONS }
	];

	const headerActions: HeaderActions = [
		{
			icon: 'split-horizontal',
			label: 'Split pane horizontally',
			onClick: () => void onAction(DICTIONARY_OVERFLOW_ACTIONS.SPLIT_HORIZONTAL)
		},
		{
			icon: 'split-vertical',
			label: 'Split pane vertically',
			onClick: () => void onAction(DICTIONARY_OVERFLOW_ACTIONS.SPLIT_VERTICAL)
		}
	];

	/** The root owns navigation after this menu returns its selected action. */
	async function onAction(action: DictionaryOverflowAction): Promise<void> {
		await navigation.backWithResult(createDictionaryOverflowActionResult(action));
	}
</script>

{#snippet leadingContent()}
	<KJVBackButton></KJVBackButton>
{/snippet}

{#snippet actionIcon(action: DictionaryOverflowAction)}
	{#if action === DICTIONARY_OVERFLOW_ACTIONS.VERSIONS}
		<DictionaryIcon classes="h-5 w-5 shrink-0" />
	{/if}
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
