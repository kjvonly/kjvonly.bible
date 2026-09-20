<script lang="ts">
	// ================================ IMPORTS ================================

	// MODELS / APPLICATION
	import {
		Modules,
		PaneSplit,
		useApplicationContext
	} from '$lib/application';

	import {
		BufferBody,
		BufferContainer,
		BufferHeader
	} from '$lib/application/ui';

	// COMPONENTS
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import ArrowBack from '$lib/components/svgs/arrowBack.svelte';

	// SERVICES
	const {
		workspaceRuntime
	} = useApplicationContext();

	// =============================== BINDINGS ================================

	let {
		showMenuPopup = $bindable<boolean>(),
		showCopyVersesPopup = $bindable<boolean>(),
		showBibleVersionPopup = $bindable<boolean>(),
		paneID
	}: {
		showMenuPopup: boolean;
		showCopyVersesPopup: boolean;
		showBibleVersionPopup: boolean;
		paneID: string;
	} = $props();

	// ================================= VARS ==================================

	let clientHeight = $state(0);
	let headerHeight = $state(0);

	let actions: Record<string, () => void> = {
		'copy verses': () => {
			showMenuPopup = false;
			showCopyVersesPopup = true;
		},
		'bible version': () => {
			showMenuPopup = false;
			showBibleVersionPopup = true;
		},
		search: () => {
			workspaceRuntime.replaceBuffer(
				paneID,
				Modules.SEARCH
			);
		},
		notes: () => {
			workspaceRuntime.replaceBuffer(
				paneID,
				Modules.NOTES
			);
		},
		'split vertical': () => {
			onSplitVertical();
		},
		'split horizontal': () => {
			onSplitHorizontal();
		},
		close: () => {
			onClosePane();
		}
	};

	// ============================== CLICK FUNCS ==============================

	function onSplitVertical(): void {
		workspaceRuntime.splitPane(
			paneID,
			PaneSplit.VERTICAL,
			Modules.MODULES,
			{}
		);
		showMenuPopup = false;
	}

	function onSplitHorizontal(): void {
		workspaceRuntime.splitPane(
			paneID,
			PaneSplit.HORIZONTAL,
			Modules.MODULES,
			{}
		);
		showMenuPopup = false;
	}

	function onClosePane(): void {
		workspaceRuntime.closePane(
			paneID
		);
	}

	function onBack(): void {
		showMenuPopup = false;
	}
</script>

<!-- ============================== CONTAINER ============================== -->

<BufferContainer bind:clientHeight>
	<BufferHeader bind:headerHeight>
		<KJVButton onClick={onBack} classes="">
			<ArrowBack classes=""></ArrowBack>
		</KJVButton>
	</BufferHeader>

	<BufferBody
		bind:clientHeight
		bind:headerHeight
		classes={'remove-default-class'}
	>
		{#each Object.keys(actions) as action}
			<div class="w-full">
				<button
					onclick={() => actions[action]()}
					class="w-full bg-neutral-50 p-4 text-start capitalize hover:bg-neutral-100"
				>
					{action}
				</button>
			</div>
		{/each}
	</BufferBody>
</BufferContainer>
