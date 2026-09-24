<script lang="ts">
	import type { Snippet } from 'svelte';

	// COMPONENTS
	import BufferBody from '../../../runtime/buffer/components/bufferBody.svelte';
	import BufferHeader from '../../../runtime/buffer/components/bufferHeader.svelte';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import ArrowBack from '$lib/components/svgs/arrowBack.svelte';
	import Close from '$lib/components/svgs/close.svelte';

	// =============================== BINDINGS ================================

	let {
		title,
		clientHeight,
		onBack,
		onClose,
		bodyClasses = 'px-4',
		children
	}: {
		title: string;
		clientHeight: number;
		onBack?: (event: Event) => void;
		onClose?: (event: Event) => void;
		bodyClasses?: string;
		children: Snippet;
	} = $props();

	// ================================= VARS ==================================

	let headerHeight = $state(0);
</script>

<!-- ================================ HEADER =============================== -->

{#snippet header()}
	<div class="grid w-full grid-cols-3 place-items-center">
		<div class="flex justify-center justify-self-start pe-4">
			{#if onBack}
				<KJVButton classes="" onClick={onBack}>
					<ArrowBack classes=""></ArrowBack>
					<span class="sr-only">Back</span>
				</KJVButton>
			{/if}
		</div>

		<span class="text-center">{title}</span>

		<div class="flex justify-center justify-self-end ps-4">
			{#if onClose}
				<KJVButton classes="" onClick={onClose}>
					<Close classes=""></Close>
					<span class="sr-only">Close settings</span>
				</KJVButton>
			{/if}
		</div>
	</div>
{/snippet}

<!-- ============================== CONTAINER ============================== -->

<BufferHeader bind:headerHeight>
	{@render header()}
</BufferHeader>

<BufferBody {headerHeight} {clientHeight} classes={bodyClasses}>
	{@render children()}
</BufferBody>
