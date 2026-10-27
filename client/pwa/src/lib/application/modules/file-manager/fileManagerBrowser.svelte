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

	import FileManagerDirectoryGridItem from './components/fileManagerDirectoryGridItem.svelte';
	import FileManagerDirectoryListItem from './components/fileManagerDirectoryListItem.svelte';
	import FileManagerResourceGridItem from './components/fileManagerResourceGridItem.svelte';
	import FileManagerResourceListItem from './components/fileManagerResourceListItem.svelte';
	import FileManagerScreen from './components/fileManagerScreen.svelte';
	import type {
		FileManagerDirectory,
		FileManagerResource
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

	const fileManagerService =
		new FileManagerService();

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

	/** Opens a file together with same-extension siblings in displayed order. */
	function openResource(
		resource: FileManagerResource,
		index: number,
		currentDirectory: FileManagerDirectory
	): void {
		navigation.openResource(
			resource.entry.descriptor,
			resource.entry.path,
			{
				entries: currentDirectory.resources.map(
					(item) => $state.snapshot(item.entry)
				),
				selectedIndex: index
			}
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

<!-- Shows filesystem source and ancestry at every pane width, wrapping whole path segments. -->
{#snippet folderBreadcrumbs()}
	<nav
		aria-label="Current folder"
		class="sticky top-0 z-10 flex min-h-[44px] w-full min-w-0 max-w-full shrink-0 flex-wrap items-center gap-x-2 gap-y-1 bg-neutral-50 px-4 py-2 text-sm text-neutral-500"
	>
		<span class="min-w-0 max-w-full [overflow-wrap:anywhere]">
			{petNameService.resolve(filesystemPublisher)}
		</span>

		{#each breadcrumbs as breadcrumb (breadcrumb.path)}
			<span class="inline-flex min-w-0 max-w-full items-center gap-2">
				<span aria-hidden="true" class="shrink-0">/</span>

				{#if breadcrumb.path === path}
					<span
						aria-current="page"
						class="min-w-0 text-support-a-500 [overflow-wrap:anywhere]"
					>
						{breadcrumb.name}
					</span>
				{:else}
					<button
						type="button"
						onclick={() => openBreadcrumb(breadcrumb.path)}
						class="min-h-[44px] min-w-0 text-left text-neutral-500 hover:text-support-a-500 focus-visible:outline-2 focus-visible:outline-primary-500 [overflow-wrap:anywhere]"
					>
						{breadcrumb.name}
					</button>
				{/if}
			</span>
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

		{#each currentDirectory.resources as resource, index (resource.path)}
			<FileManagerResourceGridItem
				display={fileManagerService.describeResource(resource.entry)}
				onOpen={() => openResource(resource, index, currentDirectory)}
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

		{#each currentDirectory.resources as resource, index (resource.path)}
			<FileManagerResourceListItem
				display={fileManagerService.describeResource(resource.entry)}
				onOpen={() => openResource(resource, index, currentDirectory)}
			></FileManagerResourceListItem>
		{/each}
	</div>
{/snippet}

<FileManagerScreen {title} {actions}>
	{@render folderBreadcrumbs()}

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
