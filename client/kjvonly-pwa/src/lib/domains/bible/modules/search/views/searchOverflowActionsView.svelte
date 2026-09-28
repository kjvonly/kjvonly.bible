<script lang="ts">
	// APPLICATION
	import {
		useNavigationRuntimeContext,
		usePaneLayoutContext
	} from '$lib/application';

	// COMPONENTS
	import {
		KJVMenuView,
		type KJVMenuAction
	} from '$lib/components';

	// MODELS
	import {
		SEARCH_NAVIGATION_RESULTS,
		SEARCH_OVERFLOW_ACTIONS,
		type SearchOverflowAction
	} from '../../../models/search-navigation.model';

	const paneLayout = usePaneLayoutContext();
	let clientHeight = $derived(
		paneLayout.clientHeight
	);

	const {
		navigation
	} = useNavigationRuntimeContext();

	const actions:
		readonly KJVMenuAction<SearchOverflowAction>[] = [
			{
				label: 'Bible version',
				value:
					SEARCH_OVERFLOW_ACTIONS.BIBLE_VERSION
			}
		];

	async function onAction(
		action: SearchOverflowAction
	): Promise<void> {
		await navigation.backWithResult({
			type:
				SEARCH_NAVIGATION_RESULTS.OVERFLOW_ACTION,
			action
		});
	}
</script>

<KJVMenuView
	title="More actions"
	{clientHeight}
	{actions}
	onBack={() => navigation.back()}
	{onAction}
></KJVMenuView>
