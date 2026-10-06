<script lang="ts">
	import {
		onMount
	} from 'svelte';

	import {
		KJVAsyncState,
		type HeaderActions
	} from '$lib/components';
	import {
		useApplicationContext
	} from '../../runtime/application-context';
	import {
		useNavigationEntryContext
	} from '../../runtime/navigation/navigation-entry-context';
	import {
		usePaneLayoutContext
	} from '../../runtime/pane/pane-layout-context';

	import FileManagerDirectoryGridItem from './components/fileManagerDirectoryGridItem.svelte';
	import FileManagerDirectoryListItem from './components/fileManagerDirectoryListItem.svelte';
	import FileManagerResourceGridItem from './components/fileManagerResourceGridItem.svelte';
	import FileManagerResourceListItem from './components/fileManagerResourceListItem.svelte';
	import FileManagerScreen from './components/fileManagerScreen.svelte';
	import type {
		FileManagerDirectory
	} from './models/file-manager-tree.model';
	import type {
		FileManagerViewMode
	} from './models/file-manager-navigation.model';
	import {
		useFileManagerNavigationContext
	} from './runtime/file-manager-navigation-context';
	import {
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

	const paneLayout =
		usePaneLayoutContext();

	const fileManagerService =
		new FileManagerService();

	// Breadcrumb visibility is based on the Pane itself, not the global viewport.
	const BREADCRUMB_MIN_PANE_WIDTH = 640;

	let directory = $state<FileManagerDirectory>();
	let loadState: 'loading' | 'ready' | 'missing' | 'failure' =
		$state('loading');
	// Invalidates older retries and in-flight loads after this view is unmounted.
	let loadRequestGeneration = 0;

	// Persisted key remains `publisher`; the local name states its filesystem meaning.
	const filesystemPublisher =
		requireStringState('publisher');
	const rootPath =
		requireStringState('rootPath');
	const path =
		requireStringState('path');
	let viewMode = $state(
		requireViewMode()
	);
	const title = basename(path);

	const showBreadcrumbs = $derived(
		paneLayout.clientWidth >= BREADCRUMB_MIN_PANE_WIDTH
	);

	const breadcrumbs = $derived.by(
		() => fileManagerService.buildBreadcrumbs(
			rootPath,
			path
		)
	);

	let actions = $derived.by(
		(): HeaderActions => [
			{
				icon: 'search',
				label: 'Search files',
				onClick: openSearch
			},
			{
				icon: viewMode === 'list' ? 'grid' : 'list',
				label: viewMode === 'list' ? 'Grid view' : 'List view',
				onClick: toggleViewMode
			}
		]
	);

	onMount(() => {
		void loadDirectory();

		return () => {
			loadRequestGeneration += 1;
		};
	});

	// Each invocation claims a generation; only the newest request may update view state.
	async function loadDirectory(): Promise<void> {
		const requestGeneration =
			++loadRequestGeneration;

		loadState = 'loading';

		try {
			const nextDirectory =
				await fileManagerService.loadDirectory(
					filesystemService,
					filesystemPublisher,
					rootPath,
					path
				);

			if (requestGeneration !== loadRequestGeneration) {
				return;
			}

			if (!nextDirectory) {
				loadState = 'missing';
				return;
			}

			directory = nextDirectory;
			loadState = 'ready';
		} catch {
			if (requestGeneration !== loadRequestGeneration) {
				return;
			}

			loadState = 'failure';
		}
	}

	function openSearch(): void {
		navigation.openSearch(viewMode);
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

	function openDirectory(
		targetDirectoryPath: string
	): void {
		navigation.openDirectory(
			filesystemPublisher,
			rootPath,
			targetDirectoryPath,
			viewMode
		);
	}

	function openBreadcrumb(
		breadcrumbPath: string
	): void {
		if (breadcrumbPath === path) {
			return;
		}

		navigation.backToAncestorDirectory(
			path,
			breadcrumbPath
		);
	}

	function requireStringState(
		key: 'publisher' | 'rootPath' | 'path'
	): string {
		const value =
			navigationState.state[key];

		if (typeof value !== 'string') {
			throw new Error(
				`FileManager browser navigation requires ${key}.`
			);
		}

		return value;
	}

	function requireViewMode(): FileManagerViewMode {
		const value =
			navigationState.state.viewMode;

		if (
			value !== 'list' &&
			value !== 'grid'
		) {
			throw new Error(
				'FileManager browser navigation requires a valid viewMode.'
			);
		}

		return value;
	}

	function basename(value: string): string {
		const index = value.lastIndexOf('/');

		return index === -1
			? value
			: value.slice(index + 1);
	}

</script>

<!-- Shows filesystem source/ancestry on wide panes, including the mounted root itself. -->
{#snippet folderBreadcrumbs()}
	<nav
		aria-label="Current folder"
		class="flex min-h-[44px] w-full items-center gap-2 overflow-x-auto px-4 py-2 text-sm text-neutral-500"
	>
		<span class="shrink-0">{petNameService.resolve(filesystemPublisher)}</span>
		<span aria-hidden="true" class="shrink-0">/</span>

		{#each breadcrumbs as breadcrumb, index (breadcrumb.path)}
			{#if index > 0}
				<span aria-hidden="true" class="shrink-0">/</span>
			{/if}

			{#if breadcrumb.path === path}
				<span
					aria-current="page"
					class="shrink-0 text-support-a-500"
				>
					{breadcrumb.name}
				</span>
			{:else}
				<button
					type="button"
					onclick={() => openBreadcrumb(breadcrumb.path)}
					class="min-h-[44px] shrink-0 text-neutral-500 hover:text-support-a-500 focus-visible:outline-2 focus-visible:outline-primary-500"
				>
					{breadcrumb.name}
				</button>
			{/if}
		{/each}
	</nav>
{/snippet}

<!-- Represents the initial/in-flight filesystem read for the current folder. -->
{#snippet loadingFolderState()}
	<KJVAsyncState message="Loading folder…"></KJVAsyncState>
{/snippet}

<!-- Distinguishes a valid filesystem read whose requested projected folder no longer exists. -->
{#snippet missingFolderState()}
	<KJVAsyncState
		kind="failure"
		message="Folder not found."
	></KJVAsyncState>
{/snippet}

<!-- Presents a recoverable filesystem read failure and keeps retry behavior near the state UI. -->
{#snippet folderLoadFailureState()}
	<KJVAsyncState
		kind="failure"
		message="Unable to load folder."
		onRetry={() => void loadDirectory()}
	></KJVAsyncState>
{/snippet}

<!-- Shows a successful directory projection that currently has no child folders or Resources. -->
{#snippet emptyFolderState()}
	<div class="px-4 py-4 text-sm text-neutral-500">This folder is empty.</div>
{/snippet}

<!-- Renders the current directory as aligned icon tiles while preserving directories-before-Resources ordering. -->
{#snippet folderGrid(currentDirectory: FileManagerDirectory)}
	<div class="grid w-full auto-rows-fr grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-3 p-4">
		{#each currentDirectory.directories as child (child.path)}
			<FileManagerDirectoryGridItem
				name={child.name}
				onOpen={() => openDirectory(child.path)}
			></FileManagerDirectoryGridItem>
		{/each}

		{#each currentDirectory.resources as resource (resource.path)}
			<FileManagerResourceGridItem
				display={fileManagerService.describeResource(resource.entry)}
				onOpen={() => navigation.openResource(resource.entry.descriptor)}
			></FileManagerResourceGridItem>
		{/each}
	</div>
{/snippet}

<!-- Renders the current directory as rows while preserving directories-before-Resources ordering. -->
{#snippet folderList(currentDirectory: FileManagerDirectory)}
	<div class="flex w-full flex-col">
		{#each currentDirectory.directories as child (child.path)}
			<FileManagerDirectoryListItem
				name={child.name}
				onOpen={() => openDirectory(child.path)}
			></FileManagerDirectoryListItem>
		{/each}

		{#each currentDirectory.resources as resource (resource.path)}
			<FileManagerResourceListItem
				display={fileManagerService.describeResource(resource.entry)}
				onOpen={() => navigation.openResource(resource.entry.descriptor)}
			></FileManagerResourceListItem>
		{/each}
	</div>
{/snippet}

<FileManagerScreen {title} {actions}>
	{#if showBreadcrumbs}
		{@render folderBreadcrumbs()}
	{/if}

	{#if loadState === 'loading'}
		{@render loadingFolderState()}
	{:else if loadState === 'missing'}
		{@render missingFolderState()}
	{:else if loadState === 'failure' || !directory}
		{@render folderLoadFailureState()}
	{:else if directory.directories.length === 0 && directory.resources.length === 0}
		{@render emptyFolderState()}
	{:else if viewMode === 'grid'}
		{@render folderGrid(directory)}
	{:else}
		{@render folderList(directory)}
	{/if}
</FileManagerScreen>
