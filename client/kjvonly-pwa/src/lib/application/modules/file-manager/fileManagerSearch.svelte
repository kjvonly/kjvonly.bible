<script lang="ts">
	import {
		onMount
	} from 'svelte';

	import {
		KJVAsyncState,
		type HeaderActions
	} from '$lib/components';
	import SearchInput from '$lib/components/inputs/searchInput.svelte';

	import {
		useApplicationContext
	} from '../../runtime/application-context';
	import {
		useNavigationEntryContext
	} from '../../runtime/navigation/navigation-entry-context';

	import FileManagerResourceGridItem from './components/fileManagerResourceGridItem.svelte';
	import FileManagerResourceListItem from './components/fileManagerResourceListItem.svelte';
	import FileManagerScreen from './components/fileManagerScreen.svelte';
	import type {
		FileManagerViewMode
	} from './models/file-manager-navigation.model';
	import type {
		FileManagerSearchFileType
	} from './models/file-manager-search-file-type.model';
	import type {
		LocatedFilesystemEntry
	} from './models/located-filesystem-entry.model';
	import type {
		FileManagerSearchFilters
	} from './runtime/search/file-manager-search.model';
	import {
		useFileManagerNavigationContext
	} from './runtime/file-manager-navigation-context';
	import {
		FileManagerSearchUnavailableError,
		FileManagerService
	} from './services/file-manager.service';

	const {
		filesystemService,
		petNameService
	} = useApplicationContext();

	const {
		navigationState,
		updateState
	} = useNavigationEntryContext();

	const navigation =
		useFileManagerNavigationContext();

	/**
	 * Intentionally entry-local: this service owns this mounted Search entry's
	 * ephemeral Worker/runtime. Hidden navigation entries remain mounted, so a
	 * shared service could let one Search entry replace or dispose another's
	 * runtime.
	 */
	const fileManagerService =
		new FileManagerService();

	let results = $state<readonly LocatedFilesystemEntry[]>([]);
	let searchEntries: readonly LocatedFilesystemEntry[] = [];
	let filesystemPublisherOptions = $state<readonly string[]>([]);
	let rootPathOptions = $state<readonly string[]>([]);
	let resourcePublisherOptions = $state<readonly string[]>([]);
	let dataTypeOptions = $state<readonly string[]>([]);
	let mediaTypeOptions = $state<readonly string[]>([]);
	let categoryOptions = $state<readonly string[]>([]);
	let loadState: 'loading' | 'ready' | 'failure' =
		$state('loading');
	let searchState: 'idle' | 'searching' | 'ready' | 'failure' =
		$state('idle');
	let showFilters = $state(false);
	// Invalidates results from searches started before a newer query/retry/unmount.
	let searchRequestGeneration = 0;

	let query = $state(
		requireStringState('query')
	);
	// Persisted key remains `publisher`; the local name states its filesystem meaning.
	let filesystemPublisher = $state(
		optionalStringState('publisher')
	);
	let rootPath = $state(
		optionalStringState('rootPath')
	);
	let resourcePublisher = $state(
		optionalStringState('resourcePublisher')
	);
	let category = $state(
		requireStringState('category')
	);
	let dataType = $state(
		requireStringState('dataType')
	);
	let mediaType = $state(
		requireStringState('mediaType')
	);
	let fileType = $state(
		requireFileType()
	);
	let viewMode = $state(
		requireViewMode()
	);

	let hasFilters = $derived(
		filesystemPublisher.length > 0 ||
		rootPath.length > 0 ||
		resourcePublisher.length > 0 ||
		category.length > 0 ||
		dataType.length > 0 ||
		mediaType.length > 0 ||
		fileType !== 'all'
	);

	let actions = $derived.by(
		(): HeaderActions => [
			{
				icon: 'filter',
				label: showFilters ? 'Hide filters' : 'Show filters',
				onClick: () => {
					showFilters = !showFilters;
				},
				selected: showFilters || hasFilters
			},
			{
				icon: viewMode === 'list' ? 'grid' : 'list',
				label: viewMode === 'list' ? 'Grid view' : 'List view',
				onClick: toggleViewMode
			}
		]
	);

	onMount(() => {
		restartSearchRuntime();

		return () => {
			searchRequestGeneration++;
			fileManagerService.disposeSearch();
		};
	});

	function restartSearchRuntime(): void {
		searchRequestGeneration++;
		void initializeSearch();
	}

	// Rebuilds the ephemeral index from current mounted filesystem mappings.
	async function initializeSearch(): Promise<void> {
		loadState = 'loading';

		try {
			const entries =
				await fileManagerService.initializeSearch(
					filesystemService
				);

			if (!entries) {
				return;
			}

			const options =
				fileManagerService.buildSearchOptions(
					entries,
					(publisher) => petNameService.resolve(publisher)
				);

			searchEntries = entries;
			filesystemPublisherOptions = options.filesystemPublishers;
			rootPathOptions =
				fileManagerService.buildRootPathOptions(
					entries,
					filesystemPublisher
				);
			resourcePublisherOptions = options.resourcePublishers;
			dataTypeOptions = options.dataTypes;
			mediaTypeOptions = options.mediaTypes;
			categoryOptions = options.categories;

			clearInvalidRootPath();
			loadState = 'ready';
			await runSearch();
		} catch (error) {
			console.error(
				'FileManager search initialization failed.',
				error
			);

			loadState = 'failure';
		}
	}

	// Each query captures a generation so late results cannot overwrite newer input.
	async function runSearch(): Promise<void> {
		if (loadState !== 'ready') {
			return;
		}

		const requestGeneration = ++searchRequestGeneration;
		searchState = 'searching';

		try {
			const nextResults =
				await fileManagerService.search({
					text: query,
					filters: createSearchFilters()
				});

			if (requestGeneration !== searchRequestGeneration) {
				return;
			}

			results = nextResults;
			searchState = 'ready';
		} catch (error) {
			console.error(
				'FileManager search failed.',
				error
			);

			if (requestGeneration !== searchRequestGeneration) {
				return;
			}

			if (error instanceof FileManagerSearchUnavailableError) {
				searchState = 'idle';
				loadState = 'failure';
				return;
			}

			searchState = 'failure';
		}
	}

	function updateQuery(value: string): void {
		query = value;
		updateState('query', value);
		void runSearch();
	}

	function updateFilesystemPublisher(value: string): void {
		filesystemPublisher = value;
		updateState('publisher', value);
		rootPathOptions =
			fileManagerService.buildRootPathOptions(
				searchEntries,
				filesystemPublisher
			);
		clearInvalidRootPath();
		void runSearch();
	}

	function updateRootPath(value: string): void {
		rootPath = value;
		updateState('rootPath', value);
		void runSearch();
	}

	function updateResourcePublisher(value: string): void {
		resourcePublisher = value;
		updateState('resourcePublisher', value);
		void runSearch();
	}

	function updateCategory(value: string): void {
		category = value;
		updateState('category', value);
		void runSearch();
	}

	function updateDataType(value: string): void {
		dataType = value;
		updateState('dataType', value);
		void runSearch();
	}

	function updateMediaType(value: string): void {
		mediaType = value;
		updateState('mediaType', value);
		void runSearch();
	}

	function updateFileType(value: string): void {
		fileType = parseFileType(value);
		updateState('fileType', fileType);
		void runSearch();
	}

	function clearFilters(): void {
		filesystemPublisher = '';
		rootPath = '';
		resourcePublisher = '';
		category = '';
		dataType = '';
		mediaType = '';
		fileType = 'all';
		updateState('publisher', '');
		updateState('rootPath', '');
		updateState('resourcePublisher', '');
		updateState('category', '');
		updateState('dataType', '');
		updateState('mediaType', '');
		updateState('fileType', 'all');
		rootPathOptions =
			fileManagerService.buildRootPathOptions(
				searchEntries
			);
		void runSearch();
	}

	function clearInvalidRootPath(): void {
		if (
			rootPath.length === 0 ||
			rootPathOptions.includes(rootPath)
		) {
			return;
		}

		rootPath = '';
		updateState('rootPath', '');
	}

	function toggleViewMode(): void {
		viewMode =
			viewMode === 'list'
				? 'grid'
				: 'list';

		updateState(
			'viewMode',
			viewMode
		);
	}

	function createSearchFilters(): FileManagerSearchFilters {
		return {
			...(filesystemPublisher.length > 0
				? { filesystemPublisher }
				: {}),
			...(rootPath.length > 0
				? { rootPath }
				: {}),
			...(resourcePublisher.length > 0
				? { resourcePublisher }
				: {}),
			...(category.length > 0
				? { category }
				: {}),
			...(dataType.length > 0
				? { dataType }
				: {}),
			...(mediaType.length > 0
				? { mediaType }
				: {}),
			...(fileType !== 'all'
				? { fileType }
				: {})
		};
	}

	function requireStringState(
		key: 'query' | 'category' | 'dataType' | 'mediaType'
	): string {
		const value =
			navigationState.state[key];

		if (typeof value !== 'string') {
			throw new Error(
				`FileManager search navigation requires ${key}.`
			);
		}

		return value;
	}

	function optionalStringState(
		key: 'publisher' | 'rootPath' | 'resourcePublisher'
	): string {
		const value =
			navigationState.state[key];

		if (value === undefined) {
			return '';
		}

		if (typeof value !== 'string') {
			throw new Error(
				`FileManager search navigation requires ${key}.`
			);
		}

		return value;
	}

	function requireFileType(): FileManagerSearchFileType {
		const value =
			navigationState.state.fileType;

		return value === undefined
			? 'all'
			: parseFileType(value);
	}

	function parseFileType(
		value: unknown
	): FileManagerSearchFileType {
		if (
			value === 'all' ||
			value === 'audio' ||
			value === 'video' ||
			value === 'image' ||
			value === 'document'
		) {
			return value;
		}

		throw new Error(
			'FileManager search navigation requires a valid fileType.'
		);
	}

	function requireViewMode(): FileManagerViewMode {
		const value =
			navigationState.state.viewMode;

		if (
			value !== 'list' &&
			value !== 'grid'
		) {
			throw new Error(
				'FileManager search navigation requires a valid viewMode.'
			);
		}

		return value;
	}


</script>

<!-- Renders the optional metadata filters that refine the current FileManager search query. -->
{#snippet searchFilters()}
	<fieldset class="flex flex-col gap-3 px-4 pb-4">
		<legend class="sr-only">Search filters</legend>
		<label class="flex flex-col gap-1 text-sm text-neutral-500">
			<span>Type</span>
			<select
				value={fileType}
				onchange={(event) => updateFileType(event.currentTarget.value)}
				class="min-h-[44px] w-full rounded-lg bg-neutral-50 px-3 text-base text-neutral-700 outline outline-1 outline-neutral-300 focus-visible:outline-2 focus-visible:outline-primary-500"
			>
				<option value="all">All</option>
				<option value="audio">Audio</option>
				<option value="video">Video</option>
				<option value="image">Images</option>
				<option value="document">Documents</option>
			</select>
		</label>

		<label class="flex flex-col gap-1 text-sm text-neutral-500">
			<span>Filesystem publisher</span>
			<select
				value={filesystemPublisher}
				onchange={(event) => updateFilesystemPublisher(event.currentTarget.value)}
				class="min-h-[44px] w-full rounded-lg bg-neutral-50 px-3 text-base text-neutral-700 outline outline-1 outline-neutral-300 focus-visible:outline-2 focus-visible:outline-primary-500"
			>
				<option value="">All filesystem publishers</option>
				{#each filesystemPublisherOptions as value (value)}
					<option value={value}>{petNameService.resolve(value)}</option>
				{/each}
			</select>
		</label>

		<label class="flex flex-col gap-1 text-sm text-neutral-500">
			<span>Root</span>
			<select
				value={rootPath}
				onchange={(event) => updateRootPath(event.currentTarget.value)}
				class="min-h-[44px] w-full rounded-lg bg-neutral-50 px-3 text-base text-neutral-700 outline outline-1 outline-neutral-300 focus-visible:outline-2 focus-visible:outline-primary-500"
			>
				<option value="">All roots</option>
				{#each rootPathOptions as value (value)}
					<option value={value}>{value}</option>
				{/each}
			</select>
		</label>

		<label class="flex flex-col gap-1 text-sm text-neutral-500">
			<span>Resource publisher</span>
			<select
				value={resourcePublisher}
				onchange={(event) => updateResourcePublisher(event.currentTarget.value)}
				class="min-h-[44px] w-full rounded-lg bg-neutral-50 px-3 text-base text-neutral-700 outline outline-1 outline-neutral-300 focus-visible:outline-2 focus-visible:outline-primary-500"
			>
				<option value="">All Resource publishers</option>
				{#each resourcePublisherOptions as value (value)}
					<option value={value}>{petNameService.resolve(value)}</option>
				{/each}
			</select>
		</label>

		<label class="flex flex-col gap-1 text-sm text-neutral-500">
			<span>Data type</span>
			<select
				value={dataType}
				onchange={(event) => updateDataType(event.currentTarget.value)}
				class="min-h-[44px] w-full rounded-lg bg-neutral-50 px-3 text-base text-neutral-700 outline outline-1 outline-neutral-300 focus-visible:outline-2 focus-visible:outline-primary-500"
			>
				<option value="">All data types</option>
				{#each dataTypeOptions as value (value)}
					<option value={value}>{value}</option>
				{/each}
			</select>
		</label>

		<label class="flex flex-col gap-1 text-sm text-neutral-500">
			<span>Media type</span>
			<select
				value={mediaType}
				onchange={(event) => updateMediaType(event.currentTarget.value)}
				class="min-h-[44px] w-full rounded-lg bg-neutral-50 px-3 text-base text-neutral-700 outline outline-1 outline-neutral-300 focus-visible:outline-2 focus-visible:outline-primary-500"
			>
				<option value="">All media types</option>
				{#each mediaTypeOptions as value (value)}
					<option value={value}>{value}</option>
				{/each}
			</select>
		</label>

		<label class="flex flex-col gap-1 text-sm text-neutral-500">
			<span>Category</span>
			<select
				value={category}
				onchange={(event) => updateCategory(event.currentTarget.value)}
				class="min-h-[44px] w-full rounded-lg bg-neutral-50 px-3 text-base text-neutral-700 outline outline-1 outline-neutral-300 focus-visible:outline-2 focus-visible:outline-primary-500"
			>
				<option value="">All categories</option>
				{#each categoryOptions as value (value)}
					<option value={value}>{value}</option>
				{/each}
			</select>
		</label>

		{#if hasFilters}
			<button
				type="button"
				onclick={clearFilters}
				class="min-h-[44px] self-start rounded-lg px-3 text-support-a-500 outline outline-1 outline-neutral-300 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-primary-500"
			>
				Clear filters
			</button>
		{/if}
	</fieldset>
{/snippet}

<!-- Announces completed result counts without adding visual chrome to the Search view. -->
{#snippet searchResultAnnouncement()}
	<div class="sr-only" role="status" aria-live="polite">
		{#if loadState === 'ready' && searchState !== 'searching'}
			{results.length} {results.length === 1 ? 'result' : 'results'}
		{/if}
	</div>
{/snippet}

<!-- Represents construction of the ephemeral filesystem metadata search index. -->
{#snippet preparingSearchState()}
	<KJVAsyncState message="Preparing file search…"></KJVAsyncState>
{/snippet}

<!-- Presents initialization or terminal runtime failure and retries the full runtime. -->
{#snippet searchRuntimeFailureState()}
	<KJVAsyncState
		kind="failure"
		message="File search is unavailable."
		onRetry={restartSearchRuntime}
	></KJVAsyncState>
{/snippet}

<!-- Presents failure of an individual query while preserving the initialized search runtime. -->
{#snippet searchRequestFailureState()}
	<KJVAsyncState
		kind="failure"
		message="Search failed."
		onRetry={() => void runSearch()}
	></KJVAsyncState>
{/snippet}

<!-- Distinguishes an empty mounted filesystem snapshot from a query that simply has no matches. -->
{#snippet noSearchableFilesState()}
	<div class="flex flex-col gap-1 px-4 py-6 text-center">
		<div class="text-base">No files</div>
		<div class="text-sm text-neutral-500">No mounted files are available to search.</div>
	</div>
{/snippet}

<!-- Represents a valid search whose current query/filter combination returned no Resources. -->
{#snippet noSearchResultsState()}
	<div class="flex flex-col gap-1 px-4 py-6 text-center">
		<div class="text-base">No results</div>
		<div class="text-sm text-neutral-500">Try another search.</div>
	</div>
{/snippet}

<!-- Renders Search results as aligned Resource icon tiles; list mode retains filesystem context. -->
{#snippet searchResultsGrid()}
	<div class="grid w-full auto-rows-fr grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3 p-4" aria-busy={searchState === 'searching'}>
		{#each results as result (`${result.filesystemPublisher}:${result.rootPath}:${result.entry.path}`)}
			<FileManagerResourceGridItem
				display={fileManagerService.describeResource(result.entry)}
				onOpen={() => navigation.openResource(result.entry.descriptor)}
			></FileManagerResourceGridItem>
		{/each}
	</div>
{/snippet}

<!-- Renders Search results as rows with relative directory and filesystem-root context. -->
{#snippet searchResultsList()}
	<div class="flex w-full flex-col" aria-busy={searchState === 'searching'}>
		{#each results as result (`${result.filesystemPublisher}:${result.rootPath}:${result.entry.path}`)}
			{@const location = fileManagerService.describeSearchLocation(
				result,
				(filesystemPublisher) =>
					petNameService.resolve(filesystemPublisher)
			)}
			<FileManagerResourceListItem
				display={fileManagerService.describeResource(result.entry)}
				context={location.relativeDirectoryPath
					? [location.relativeDirectoryPath, location.filesystemRootLabel]
					: [location.filesystemRootLabel]}
				onOpen={() => navigation.openResource(result.entry.descriptor)}
			></FileManagerResourceListItem>
		{/each}
	</div>
{/snippet}

<FileManagerScreen title="Search" {actions}>
	<div class="sticky top-0 z-10 bg-neutral-50">
		<SearchInput
			value={query}
			placeholder="Search files"
			focusOnMount={true}
			onInput={updateQuery}
		></SearchInput>

		{#if showFilters}
			{@render searchFilters()}
		{/if}
	</div>

	{@render searchResultAnnouncement()}

	{#if loadState === 'loading'}
		{@render preparingSearchState()}
	{:else if loadState === 'failure'}
		{@render searchRuntimeFailureState()}
	{:else if searchState === 'failure'}
		{@render searchRequestFailureState()}
	{:else if filesystemPublisherOptions.length === 0 && searchState !== 'searching'}
		{@render noSearchableFilesState()}
	{:else if results.length === 0 && searchState !== 'searching'}
		{@render noSearchResultsState()}
	{:else if viewMode === 'grid'}
		{@render searchResultsGrid()}
	{:else}
		{@render searchResultsList()}
	{/if}
</FileManagerScreen>
