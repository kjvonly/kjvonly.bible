<script lang="ts">
	// ================================ IMPORTS ================================

	import {
		usePaneLayoutContext
	} from '../../runtime/pane/pane-layout-context';
	// APPLICATION
	import {
		useNavigationRuntimeContext
	} from '$lib/application/runtime/navigation/navigation-runtime-context';

	// COMPONENTS
	import ViewBody from '$lib/application/runtime/navigation/components/viewBody.svelte';
	import ViewHeader from '$lib/application/runtime/navigation/components/viewHeader.svelte';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import Close from '$lib/components/svgs/close.svelte';

	// MODELS
	import {
		ARCHIVE_VIEWS,
		type ArchiveView
	} from './archive-navigation.model';

	// =============================== BINDINGS ================================

	const paneLayout = usePaneLayoutContext();
	let clientHeight = $derived(
		paneLayout.clientHeight
	);

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

<ViewHeader bind:headerHeight>
	{@render header()}
</ViewHeader>

<ViewBody {clientHeight} {headerHeight} classes="">
	{@render body()}
</ViewBody>
