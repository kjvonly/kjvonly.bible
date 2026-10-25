<!-- Dictionary Resource selector: follows the Bible version picker/backWithResult pattern. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { useApplicationContext, useNavigationEntryContext, useNavigationRuntimeContext, usePaneLayoutContext } from '$lib/application';
	import { KJVBackButton, ViewBody, ViewHeader } from '$lib/application/ui';
	import { KJVAsyncState, KJVHeader } from '$lib/components';
	import { parseDictionaryResourceId } from '../models/dictionary-identity';
	import { createDictionaryEditionNavigationResult } from '../models/dictionary-navigation.model';
	import { DICTIONARY_RESOURCE_TYPE } from '../resources/entries/dictionary-resource-contract';
	import type { DictionaryEditionManifest } from '../models/dictionary.model';

	const { dictionaryService, moduleResourceSelectionResolver } = useApplicationContext();
	const { navigationState } = useNavigationEntryContext();
	const { navigation } = useNavigationRuntimeContext();
	const paneLayout = usePaneLayoutContext();
	const clientHeight = $derived(paneLayout.clientHeight);
	let headerHeight = $state(0);
	let editions: readonly DictionaryEditionManifest[] = $state([]);
	let loading = $state(true);
	let error: string | undefined = $state();
	const selected = moduleResourceSelectionResolver.require(navigationState, DICTIONARY_RESOURCE_TYPE);

	async function loadEditions(): Promise<void> {
		loading = true;
		error = undefined;
		try { editions = await dictionaryService.listInstalledEditions(); }
		catch (reason) { error = reason instanceof Error ? reason.message : String(reason); }
		finally { loading = false; }
	}

	onMount(() => { void loadEditions(); });
</script>

{#snippet leadingContent()}
	<KJVBackButton></KJVBackButton>
{/snippet}

<ViewHeader bind:headerHeight>
	<KJVHeader title="Dictionary versions" {leadingContent}></KJVHeader>
</ViewHeader>
<ViewBody {clientHeight} {headerHeight} classes="px-0">
	{#if loading}
		<KJVAsyncState inset={false} message="Loading installed dictionaries…"></KJVAsyncState>
	{:else if error}
		<KJVAsyncState kind="failure" inset={false} message={error} retryLabel="Retry" onRetry={() => void loadEditions()}></KJVAsyncState>
	{:else if editions.length === 0}
		<p class="px-4 py-3 text-sm">No installed dictionaries are available yet.</p>
	{:else}
		{#each editions as edition (`${edition.publisher}/${edition.resourceId}`)}
			<button type="button" class="flex min-h-11 w-full flex-col gap-1 bg-neutral-50 px-4 py-3 text-start hover:bg-neutral-100"
				onclick={() => navigation.backWithResult(createDictionaryEditionNavigationResult(edition))}>
				<span class="capitalize">{parseDictionaryResourceId(edition.resourceId).edition.replaceAll('-', ' ')}</span>
				<span class="text-xs text-neutral-600">{edition.entryCount} definitions · {edition.publisher.slice(0, 12)}{selected.publisher === edition.publisher && selected.resourceId === edition.resourceId ? ' · Selected' : ''}</span>
			</button>
		{/each}
	{/if}
</ViewBody>
