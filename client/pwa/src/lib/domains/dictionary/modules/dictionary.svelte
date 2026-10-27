<!-- Dictionary root: the navigation entry selects one Resource, just as Bible Search does. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import uuid4 from 'uuid4';
	import {
		Modules,
		MODULES_VIEWS,
		PaneSplit,
		useApplicationContext,
		useNavigationEntryContext,
		useNavigationRuntimeContext,
		usePaneLayoutContext
	} from '$lib/application';
	import { KJVBackButton, KJVMoreActionsButton, ViewBody, ViewHeader } from '$lib/application/ui';
	import { REFS_VIEWS } from '$lib/domains/bible';
	import { KJVAdaptiveHeaderTitle, KJVAsyncState, KJVHeader } from '$lib/components';
	import SearchInput from '$lib/components/inputs/searchInput.svelte';
	import type { DictionaryEditionSource, DictionarySearchMatch } from '../models/dictionary.model';
	import { parseDictionaryResourceId } from '../models/dictionary-identity';
	import {
		DICTIONARY_VIEWS,
		DICTIONARY_OVERFLOW_ACTIONS,
		parseDictionaryOverflowActionResult,
		createDictionaryEntryNavigationState,
		parseDictionaryEditionNavigationResult,
		parseDictionaryRootNavigationState
	} from '../models/dictionary-navigation.model';
	import { DICTIONARY_RESOURCE_TYPE } from '../resources/entries/dictionary-resource-contract';
	import type { DictionaryInstallationStatus } from '../services/dictionary-installation.service';
	import { DictionaryHeadwordSearchSession } from './search/dictionary-headword-search-session.svelte';
	import DictionarySearchResults from '../ui/DictionarySearchResults.svelte';
	import DictionaryAlphabetBrowse from '../ui/DictionaryAlphabetBrowse.svelte';
	import ABCIcon from '$lib/components/svgs/abc.svelte';

	const { dictionaryService, moduleResourceSelectionResolver } = useApplicationContext();
	const { navigationState, updateState, updateResourceSelection, onResult, whenActive } = useNavigationEntryContext();
	const { navigation } = useNavigationRuntimeContext();
	const paneLayout = usePaneLayoutContext();
	const clientHeight = $derived(paneLayout.clientHeight);
	let headerHeight = $state(0);
	const searchInputId = `dictionary-headword-query-${uuid4()}`;

	if (navigationState.module !== Modules.DICTIONARY || navigationState.view !== DICTIONARY_VIEWS.ROOT) {
		throw new Error('Invalid Dictionary root view');
	}

	const restored = parseDictionaryRootNavigationState(navigationState.state);
	let selectedSource: DictionaryEditionSource = $state({
		...moduleResourceSelectionResolver.require(navigationState, DICTIONARY_RESOURCE_TYPE)
	});
	let editionStatus: DictionaryInstallationStatus | undefined = $state();
	let loadingEdition = $state(true);
	let query = $state(restored.query);
	let browseLetter = $state(restored.browseLetter);
	let showAlphabet = $state(restored.showAlphabet);
	const searchSession = new DictionaryHeadwordSearchSession(dictionaryService);
	let mounted = false;

	/** Keep publishers and Resource identities distinct, even for identically named editions. */
	function sameSource(left: DictionaryEditionSource, right: DictionaryEditionSource): boolean {
		return left.publisher === right.publisher && left.resourceId === right.resourceId;
	}

	function editionLabel(source: DictionaryEditionSource): string {
		const edition = parseDictionaryResourceId(source.resourceId).edition.replaceAll('-', ' ');
		return edition.charAt(0).toUpperCase() + edition.slice(1);
	}

	function changeQuery(value: string): void {
		query = value;
		updateState('query', value);
		if (value.trim() && showAlphabet) {
			showAlphabet = false;
			updateState('showAlphabet', false);
		}
	}

	function changeBrowseLetter(letter: string): void {
		browseLetter = letter;
		updateState('browseLetter', letter);
	}

	/** The ABC action switches between text search and alphabetical browsing. */
	function toggleAlphabet(): void {
		showAlphabet = !showAlphabet;
		updateState('showAlphabet', showAlphabet);
		if (showAlphabet) {
			changeQuery('');
			changeBrowseLetter('a');
		}
	}

	/** Service notifications are shared, but each pane displays only its selected Resource. */
	function onEditionStatus(status: DictionaryInstallationStatus): void {
		if (!mounted || !sameSource(status.source, selectedSource)) return;
		editionStatus = status;
		loadingEdition = false;
	}

	/** Prepare one selected Resource; the installation service deduplicates concurrent requests. */
	async function prepareSelectedEdition(): Promise<void> {
		const source = { publisher: selectedSource.publisher, resourceId: selectedSource.resourceId };
		if (editionStatus?.status === 'ready' && sameSource(editionStatus.source, source)) return;
		loadingEdition = true;
		// Status notifications are authoritative: the service suppresses stale results
		// when an archive import accepts a newer revision during preparation.
		await dictionaryService.prepareSource(source);
	}

	/** Apply the picker's Resource selection after the root navigation entry resumes. */
	const unsubscribeResult = onResult(result => {
		const action = parseDictionaryOverflowActionResult(result);
		if (action) {
			whenActive(() => {
				switch (action) {
					case DICTIONARY_OVERFLOW_ACTIONS.VERSIONS:
						navigation.pushView(DICTIONARY_VIEWS.EDITION, {});
						break;
					case DICTIONARY_OVERFLOW_ACTIONS.SPLIT_HORIZONTAL:
						navigation.split(PaneSplit.HORIZONTAL, Modules.MODULES, MODULES_VIEWS.ROOT, {});
						break;
					case DICTIONARY_OVERFLOW_ACTIONS.SPLIT_VERTICAL:
						navigation.split(PaneSplit.VERTICAL, Modules.MODULES, MODULES_VIEWS.ROOT, {});
						break;
				}
			});
			return;
		}
		const source = parseDictionaryEditionNavigationResult(result);
		if (!source) return;
		whenActive(() => {
			if (sameSource(source, selectedSource)) return;
			updateResourceSelection(DICTIONARY_RESOURCE_TYPE, source);
			selectedSource = { ...source };
			editionStatus = undefined;
			void prepareSelectedEdition();
		});
	});

	const readyEdition = $derived(editionStatus?.status === 'ready' && sameSource(editionStatus.source, selectedSource)
		? editionStatus.edition : undefined);
	const searchableSource = $derived(readyEdition ? selectedSource : undefined);
	const canOpenDefinition = $derived(readyEdition !== undefined && definitionOpeners[readyEdition.definitionFormat] !== undefined);
	const acceptedGeneration = $derived(readyEdition?.chunkGeneration);
	const activePrefix = $derived(query.trim() || (showAlphabet ? browseLetter : ''));

	$effect(() => {
		searchSession.update(activePrefix, searchableSource, acceptedGeneration);
	});

	/** Only definition presentation varies; index search and key retrieval are shared. */
	const definitionOpeners: Record<string, (match: DictionarySearchMatch) => void> = {
		'webster-html': match => {
			navigation.pushView(DICTIONARY_VIEWS.ENTRY, createDictionaryEntryNavigationState(match, match.key));
		},
		strongs: match => {
			navigation.pushModule(Modules.STRONGS, REFS_VIEWS.ROOT, {
				refs: [match.key],
				strongsWords: [match.headword]
			});
		}
	};

	function openEntry(match: DictionarySearchMatch): void {
		const format = readyEdition?.definitionFormat;
		if (!format) return;
		const open = definitionOpeners[format];
		if (!open) throw new Error(`Unsupported Dictionary presentation format: ${format}`);
		open(match);
	}

	onMount(() => {
		mounted = true;
		const release = dictionaryService.enter();
		const unsubscribeStatus = dictionaryService.subscribeToEditionStatus(onEditionStatus);
		void prepareSelectedEdition();
		return () => {
			mounted = false;
			unsubscribeResult();
			unsubscribeStatus();
			searchSession.destroy();
			release();
		};
	});
</script>

{#snippet leadingContent()}
	<KJVBackButton></KJVBackButton>
{/snippet}

{#snippet titleContent()}
	<KJVAdaptiveHeaderTitle
		longTitle={editionLabel(selectedSource)}
		secondary={readyEdition ? `${readyEdition.entryCount} definitions` : undefined}
	/>
{/snippet}

{#snippet trailingContent()}
	<button
		type="button"
		aria-label="Toggle alphabetical browsing"
		aria-pressed={showAlphabet}
		onclick={toggleAlphabet}
		class="flex h-11 min-h-[44px] w-11 min-w-[44px] shrink-0 items-center justify-center rounded-full hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
	>
		<ABCIcon classes={`h-5 w-5 fill-current ${showAlphabet ? 'text-support-a-500' : 'text-neutral-700'}`} />
	</button>
	<KJVMoreActionsButton onClick={() => navigation.pushView(DICTIONARY_VIEWS.OVERFLOW_ACTIONS, {})} />
{/snippet}

<ViewHeader bind:headerHeight>
	<KJVHeader title={editionLabel(selectedSource)} {titleContent} {leadingContent} {trailingContent}></KJVHeader>
</ViewHeader>
<ViewBody {clientHeight} {headerHeight} classes="px-0">
	<div class="flex min-h-0 flex-1 flex-col">
		<div class="flex flex-col">
			<SearchInput
				id={searchInputId}
				value={query}
				maxLength={256}
				label="Dictionary headword search"
				focusOnMount={true}
				placeholder="Enter a word or prefix"
				onInput={changeQuery}
			/>
			{#if showAlphabet}
				<div class="px-4 pb-3">
					<DictionaryAlphabetBrowse selected={browseLetter} onSelect={changeBrowseLetter} />
				</div>
			{/if}
			{#if loadingEdition}
				<div class="px-4">
					<KJVAsyncState inset={false} message="Installing the selected dictionary. You can continue using the app."></KJVAsyncState>
				</div>
			{:else if editionStatus?.status === 'error'}
				<div class="px-4">
					<KJVAsyncState kind="failure" inset={false} message={editionStatus.error}
						retryLabel="Retry installation" onRetry={() => void prepareSelectedEdition()}></KJVAsyncState>
				</div>
			{/if}
		</div>

		{#if searchSession.searchError}
			<div class="px-4">
				<KJVAsyncState kind="failure" inset={false}
					message={searchSession.searchError ?? ''}
					retryLabel="Retry headword search" onRetry={() => searchSession.retry()}></KJVAsyncState>
			</div>
		{/if}
		{#if !readyEdition}
			<p class="px-4 py-2 text-sm text-neutral-600">The selected dictionary is not ready for browsing.</p>
		{:else if !activePrefix}
			<p class="px-4 py-2 text-sm text-neutral-600">Enter a word or turn on ABC to browse headwords.</p>
		{:else if searchSession.searching}
			<p role="status" class="px-4 py-2 text-sm">Loading headwords…</p>
		{:else if searchSession.matches.length === 0 && !searchSession.searchError}
			<p class="px-4 py-2 text-sm text-neutral-600">{query.trim() ? 'No matching headwords.' : `No headwords beginning with ${browseLetter.toUpperCase()}.`}</p>
		{:else if searchSession.matches.length > 0}
			<p role="status" class="px-4 py-2 text-xs text-neutral-600">{searchSession.matches.length} {query.trim() ? 'matching headwords' : `headwords beginning with ${browseLetter.toUpperCase()}`}</p>
		{/if}

		{#if searchSession.matches.length > 0 && !searchSession.searching}
			<div class="flex min-h-0 flex-1 flex-col">
				<DictionarySearchResults matches={searchSession.matches} onSelect={openEntry} selectable={canOpenDefinition}></DictionarySearchResults>
			</div>
		{/if}
	</div>
</ViewBody>
