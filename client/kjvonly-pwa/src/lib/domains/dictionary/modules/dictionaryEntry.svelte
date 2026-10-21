<!-- Dictionary entry: the worker resolves and normalizes only the selected definition. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Modules,
		useApplicationContext,
		useNavigationEntryContext,
		usePaneLayoutContext
	} from '$lib/application';
	import { KJVBackButton, ViewBody, ViewHeader } from '$lib/application/ui';
	import { KJVHeader } from '$lib/components';
	import type { NormalizedDocument } from '@kjvonly/normalized-content';
	import { NormalizedContentRenderer } from '$lib/domains/normalized-content/ui';
	import { parseDictionaryResourceId } from '../models/dictionary-identity';
	import {
		DICTIONARY_VIEWS,
		parseDictionaryEntryNavigationState
	} from '../models/dictionary-navigation.model';

	const { navigationState } = useNavigationEntryContext();
	const { dictionaryService, petNameService } = useApplicationContext();
	const paneLayout = usePaneLayoutContext();
	const clientHeight = $derived(paneLayout.clientHeight);
	let headerHeight = $state(0);

	if (navigationState.module !== Modules.DICTIONARY ||
		navigationState.view !== DICTIONARY_VIEWS.ENTRY) {
		throw new Error('Invalid Dictionary entry view.');
	}

	const selected = parseDictionaryEntryNavigationState(navigationState.state);
	const edition = parseDictionaryResourceId(selected.resourceId).edition.replaceAll('-', ' ');
	let document: NormalizedDocument | undefined = $state();
	let loading = $state(true);
	let error = $state<string | undefined>();
	let active = true;

	/** Ensure the navigated edition is installed before asking the worker for its definition. */
	async function loadDefinition(): Promise<void> {
		loading = true;
		error = undefined;
		try {
			const source = { publisher: selected.publisher, resourceId: selected.resourceId };
			const preparation = await dictionaryService.prepareSource(source);
			if (!active) return;
			if (preparation.status === 'error') throw new Error(preparation.error);
			const found = await dictionaryService.getNormalized(source, selected.headwordKey);
			if (active) document = found;
		} catch (reason) {
			if (active) error = reason instanceof Error ? reason.message : String(reason);
		} finally {
			if (active) loading = false;
		}
	}

	onMount(() => {
		const release = dictionaryService.enter();
		void loadDefinition();
		return () => {
			active = false;
			release();
		};
	});
</script>

{#snippet leadingContent()}
	<KJVBackButton></KJVBackButton>
{/snippet}

<ViewHeader bind:headerHeight>
	<KJVHeader title={selected.headwordKey} {leadingContent}></KJVHeader>
</ViewHeader>
<ViewBody {clientHeight} {headerHeight} classes="px-4">
	<div class="flex flex-col gap-3 py-4">
		<h2 class="text-lg">{selected.headwordKey}</h2>
		<p class="text-sm opacity-70">{edition} · {petNameService.resolve(selected.publisher, selected.publisher.slice(0, 32))}</p>
		{#if loading}
			<p role="status" class="text-sm">Loading definition…</p>
		{:else if error}
			<p role="alert" class="text-sm">{error}</p>
			<button type="button" class="min-h-11 self-start underline" onclick={() => void loadDefinition()}>Retry</button>
		{:else if document}
			<div class="py-2">
				<NormalizedContentRenderer {document}></NormalizedContentRenderer>
			</div>
		{/if}
	</div>
</ViewBody>
