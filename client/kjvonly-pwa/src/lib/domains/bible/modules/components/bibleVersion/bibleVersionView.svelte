<script lang="ts">
	import {
		KJVBackButton,
		ViewBody,
		ViewHeader
	} from '$lib/application/ui';

	import {
		onMount
	} from 'svelte';

	// APPLICATION
	import {
		useApplicationContext,
		useNavigationRuntimeContext,
		usePaneLayoutContext
	} from '$lib/application';

	// COMPONENTS
	import {
		KJVHeader
	} from '$lib/components';

	// MODELS
	import type {
		BibleVersion
	} from '../../../models/bible-version.model';

	import {
		createBibleVersionNavigationResult
	} from './bible-version-navigation-result';

	const paneLayout = usePaneLayoutContext();
	let clientHeight = $derived(
		paneLayout.clientHeight
	);

	const {
		bibleVersionsService
	} = useApplicationContext();

	const {
		navigation
	} = useNavigationRuntimeContext();

	let bibleVersions:
		BibleVersion[] =
		$state([]);

	let headerHeight =
		$state(0);

	onMount(async () => {
		bibleVersions = [
			...await bibleVersionsService
				.list()
		];
	});

	async function onVersionClicked(
		version: BibleVersion
	): Promise<void> {
		await navigation.backWithResult(
			createBibleVersionNavigationResult(
				version
			)
		);
	}
</script>

{#snippet leadingContent()}
	<KJVBackButton></KJVBackButton>
{/snippet}

<ViewHeader bind:headerHeight>
	<KJVHeader
		title="Bible version"
		{leadingContent}
	></KJVHeader>
</ViewHeader>

<ViewBody
	{clientHeight}
	{headerHeight}
	classes={'remove-default-class'}
>
	{#each bibleVersions as version}
		<button
			onclick={() =>
				onVersionClicked(
					version
				)}
			class="w-full bg-neutral-50 p-4 text-start hover:bg-neutral-100"
		>
			<div class="uppercase">
				{version.version}
			</div>

			<div class="text-xs">
				{version.publisher.slice(
					0,
					12
				)}
			</div>
		</button>
	{/each}
</ViewBody>
