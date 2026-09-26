<script lang="ts">
	// ================================ IMPORTS ================================

	// APPLICATION
	import {
		useNavigationRuntimeContext
	} from '$lib/application/runtime/navigation/navigation-runtime-context';

	// COMPONENTS
	import BufferBody from '$lib/application/runtime/buffer/components/bufferBody.svelte';
	import BufferHeader from '$lib/application/runtime/buffer/components/bufferHeader.svelte';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import Close from '$lib/components/svgs/close.svelte';

	// MODELS
	import {
		ARCHIVE_VIEWS,
		type ArchiveView
	} from './archive-navigation.model';

	// =============================== BINDINGS ================================

	let {
		clientHeight
	}: {
		clientHeight: number;
	} = $props();

	// ================================= VARS ==================================

	let headerHeight: number = $state(0);

	const {
		navigation
	} = useNavigationRuntimeContext();

	const actions: readonly {
		label: string;
		view: ArchiveView;
	}[] = [
		{
			label: 'import',
			view: ARCHIVE_VIEWS.IMPORT
		},
		{
			label: 'export',
			view: ARCHIVE_VIEWS.EXPORT
		}
	];

	// ============================== CLICK FUNCS ==============================

	function onClose(
		event: Event
	): void {
		event.stopPropagation();

		navigation.back();
	}

	function onSelect(
		view: ArchiveView
	): void {
		navigation.pushView(
			view,
			{}
		);
	}
</script>

<!-- ================================ HEADER =============================== -->

{#snippet header()}
	<span class="flex-1"></span>
	<span class="text-center">Archive</span>
	<span class="flex flex-1 justify-end">
		<KJVButton classes="" onClick={onClose}>
			<Close classes=""></Close>
		</KJVButton>
	</span>
{/snippet}

<!-- ================================= BODY ================================ -->

{#snippet body()}
	{#each actions as action}
		<div class="w-full">
			<button
				type="button"
				onclick={() => onSelect(action.view)}
				class="w-full bg-neutral-50 p-4 text-start capitalize hover:bg-neutral-100"
			>
				{action.label}
			</button>
		</div>
	{/each}
{/snippet}

<!-- ============================== CONTAINER ============================== -->

<BufferHeader bind:headerHeight>
	{@render header()}
</BufferHeader>

<BufferBody {clientHeight} {headerHeight} classes="">
	{@render body()}
</BufferBody>
