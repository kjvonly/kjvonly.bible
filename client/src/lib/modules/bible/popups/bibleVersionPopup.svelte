<script lang="ts">
	import { onMount } from 'svelte';

	// COMPONENTS
	import BufferContainer from '$lib/components/bufferContainer.svelte';
	import BufferHeader from '$lib/components/bufferHeader.svelte';
	import BufferBody from '$lib/components/bufferBody.svelte';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import ArrowBack from '$lib/components/svgs/arrowBack.svelte';
	import { bibleVersionsService } from '$lib/services/bible/bibleVersions.service';
	import Edit from '$lib/components/svgs/edit.svelte';
	import Delete from '$lib/components/svgs/delete.svelte';
	import KJVButtonRounded from '$lib/components/buttons/KJVButtonRounded.svelte';

	// =============================== BINDINGS ================================

	let {
		showBibleVersionPopup = $bindable<boolean>(),
		bibleVersion = $bindable<string>()
	} = $props();

	// ================================= VARS ==================================
	let bibleVersions: string[] = $state([]);

	const VIEW_STATES = {
		NORMAL: 0,
		EDIT: 1,
		CONFIRM: 2
	} as const;

	let clientHeight = $state(0);
	let headerHeight = $state(0);
	let viewState: number = $state(VIEW_STATES.NORMAL);
	let version = $state('');

	// =============================== LIFECYCLE ===============================

	onMount(async () => {
		let bv = await bibleVersionsService.list();
		bibleVersions = bv.sort();
		bibleVersionsService.delete('esv');
	});

	// ============================== CLICK FUNCS ==============================

	function onVersionClicked(bv: string) {
		bibleVersion = bv;
		onClose();
	}

	function onClose() {
		if (viewState === VIEW_STATES.NORMAL) {
			showBibleVersionPopup = false;
		}

		if (viewState === VIEW_STATES.EDIT) {
			viewState = VIEW_STATES.NORMAL;
		}

		if (viewState === VIEW_STATES.CONFIRM) {
			viewState = VIEW_STATES.EDIT;
		}
	}

	function onEdit() {
		viewState = VIEW_STATES.EDIT;
	}

	function onDelete(v: string) {
		version = v;
		viewState = VIEW_STATES.CONFIRM;
	}

	function onConfirm() {
		bibleVersionsService.delete(version);
		let index = bibleVersions.indexOf(version);
		bibleVersions.splice(index, 1);
		viewState = VIEW_STATES.NORMAL;
	}

	function onCancel() {
		viewState = VIEW_STATES.EDIT;
	}
</script>

<BufferContainer bind:clientHeight>
	<BufferHeader bind:headerHeight>
		<KJVButton onClick={onClose} classes="">
			<ArrowBack classes=""></ArrowBack>
		</KJVButton>

		{#if viewState === VIEW_STATES.NORMAL}
			<KJVButton onClick={onEdit} classes="">
				<Edit classes=""></Edit>
			</KJVButton>
		{/if}
	</BufferHeader>
	<BufferBody
		bind:clientHeight
		bind:headerHeight
		classes={'remove-default-class'}
	>
		{#if viewState === VIEW_STATES.EDIT}
			{#each bibleVersions as bv}
				<div class="w-full">
					<div class="w-full bg-neutral-50 p-4 text-start uppercase">
						<span class="flex">
							<span>{bv}</span>
							<span class="w-full"></span>
							<KJVButton onClick={() => onDelete(bv)} classes="">
								<Delete classes=""></Delete>
							</KJVButton>
						</span>
					</div>
				</div>
			{/each}
		{:else if viewState === VIEW_STATES.NORMAL}
			{#each bibleVersions as bv}
				<div class="w-full">
					<button
						onclick={() => onVersionClicked(bv)}
						class="w-full bg-neutral-50 p-4 text-start uppercase hover:bg-neutral-100"
					>
						{bv}
					</button>
				</div>
			{/each}
		{:else if viewState === VIEW_STATES.CONFIRM}
			<div class="flex h-full items-center justify-center">
				<div class="flex flex-col items-center justify-center">
					<div class="p-4">delete {version}?</div>
					<div>
						<KJVButtonRounded onClick={() => onCancel()}
							>cancel</KJVButtonRounded
						>
						<KJVButtonRounded onClick={() => onConfirm()}
							>confirm</KJVButtonRounded
						>
					</div>
				</div>
			</div>
		{/if}
	</BufferBody>
</BufferContainer>
