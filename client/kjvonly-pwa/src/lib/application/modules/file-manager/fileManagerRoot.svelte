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

	import type {
		FileManagerRootGroup
	} from './models/file-manager-root.model';
	import {
		useFileManagerNavigationContext
	} from './runtime/file-manager-navigation-context';

	import FileManagerFilesystemPublisherSection from './components/fileManagerFilesystemPublisherSection.svelte';
	import FileManagerScreen from './components/fileManagerScreen.svelte';
	import {
		FileManagerService
	} from './services/file-manager.service';

	const {
		filesystemService,
		petNameService
	} = useApplicationContext();

	const navigation =
		useFileManagerNavigationContext();

	const actions: HeaderActions = [
		{
			icon: 'search',
			label: 'Search files',
			onClick: () => navigation.openSearch()
		}
	];

	const fileManagerService =
		new FileManagerService();

	let rootGroups =
		$state<readonly FileManagerRootGroup[]>([]);
	let loadState: 'loading' | 'ready' | 'failure' =
		$state('loading');
	// Invalidates older retries and in-flight loads after this view is unmounted.
	let loadRequestGeneration = 0;

	onMount(() => {
		void loadRoots();

		return () => {
			loadRequestGeneration += 1;
		};
	});

	// Each invocation claims a generation; only the newest request may update view state.
	async function loadRoots(): Promise<void> {
		const requestGeneration =
			++loadRequestGeneration;

		loadState = 'loading';

		try {
			const nextRootGroups =
				await fileManagerService.loadRootGroups(
					filesystemService,
					(filesystemPublisher) =>
						petNameService.resolve(filesystemPublisher)
				);

			if (requestGeneration !== loadRequestGeneration) {
				return;
			}

			rootGroups = nextRootGroups;
			loadState = 'ready';
		} catch {
			if (requestGeneration !== loadRequestGeneration) {
				return;
			}

			loadState = 'failure';
		}
	}


</script>

<!-- Represents the initial/in-flight discovery of mounted filesystem roots. -->
{#snippet loadingFilesystemRootsState()}
	<KJVAsyncState message="Loading filesystems…"></KJVAsyncState>
{/snippet}

<!-- Presents a recoverable mounted-root discovery failure. -->
{#snippet filesystemRootsFailureState()}
	<KJVAsyncState
		kind="failure"
		message="Unable to load filesystems."
		onRetry={() => void loadRoots()}
	></KJVAsyncState>
{/snippet}

<!-- Shows the valid empty state when no mounted filesystem roots are available. -->
{#snippet noFilesystemRootsState()}
	<div class="flex flex-col gap-1 px-4 py-4">
		<div class="text-base">No filesystems</div>
		<div class="text-sm text-neutral-500">No mounted filesystem roots are available.</div>
	</div>
{/snippet}

<!-- Renders mounted roots grouped beneath their filesystem-mapping publisher. -->
{#snippet filesystemRootGroups()}
	<div class="flex w-full flex-col">
		{#each rootGroups as rootGroup (rootGroup.filesystemPublisher)}
			<FileManagerFilesystemPublisherSection
				filesystemPublisherName={rootGroup.filesystemPublisherName}
				roots={rootGroup.roots}
			></FileManagerFilesystemPublisherSection>
		{/each}
	</div>
{/snippet}

<FileManagerScreen title="Files" {actions}>
	{#if loadState === 'loading'}
		{@render loadingFilesystemRootsState()}
	{:else if loadState === 'failure'}
		{@render filesystemRootsFailureState()}
	{:else if rootGroups.length === 0}
		{@render noFilesystemRootsState()}
	{:else}
		{@render filesystemRootGroups()}
	{/if}
</FileManagerScreen>
