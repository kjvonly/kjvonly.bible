<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onMount } from 'svelte';

	// COMPONENTS
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';

	// // SVGS
	import Asterisk from '$lib/components/svgs/asterisk.svelte';
	import ShortText from '$lib/components/svgs/shortText.svelte';
	import KeyboardArrowDown from '$lib/components/svgs/keyboardArrowDown.svelte';
	import KeyboardArrowRight from '$lib/components/svgs/keyboardArrowRight.svelte';

	// OTHERS
	import { numberToLetters } from '$lib/services/dynamicGrid.service';

	// =============================== BINDINGS ================================

	let {
		hasCrossRef,
		footnotes: footnotesByID,
		chapterFootnotes
	}: {
		hasCrossRef: boolean;
		footnotes: string[];
		chapterFootnotes: { [key: string]: string };
	} = $props();

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		setFootnotes();
	});

	// ================================== VARS =================================
	let footnotes: Footnote[] = $state([]);
	let toggle = $state(false);

	interface Footnote {
		key: string;
		html: string;
		toggle: boolean;
	}

	// ================================ FUNCS ==================================
	function setFootnotes(): void {
		footnotesByID.forEach((f: any) => {
			let key = f?.split('_')[2];
			footnotes.push({
				key: numberToLetters(key),
				html: chapterFootnotes[key],
				toggle: false
			});
		});
	}

	// ============================== CLICK FUNCS ==============================

	function onToggleFootnotes(): void {
		toggle = !toggle;
	}

	function onToggleFootnote(fn: Footnote) {
		fn.toggle = !fn.toggle;
	}
</script>

<!-- ================================ HEADER =============================== -->

{#snippet footnotesToggle()}
	<div class="flex flex-row items-center">
		<KJVButton classes="" onClick={onToggleFootnotes}>
			{#if !toggle}
				<KeyboardArrowRight></KeyboardArrowRight>
			{:else}
				<KeyboardArrowDown></KeyboardArrowDown>
			{/if}
		</KJVButton>
		<Asterisk></Asterisk>
		<p class="ps-1 pe-4 capitalize">footnotes</p>
	</div>
{/snippet}

<!-- ================================= BODY ================================ -->
{#snippet multipleFootnotes()}
	{#if footnotes.length > 1 || hasCrossRef}
		{@render footnotesToggle()}
		<div class="flex flex-col">
			{#if toggle}
				{@render footnoteList()}
			{/if}
		</div>
	{/if}
{/snippet}

{#snippet footnoteList()}
	{#each footnotes as f}
		<div class="ps-2">
			<p class="flex flex-row items-center pt-2">
				<KJVButton classes="" onClick={() => onToggleFootnote(f)}>
					{#if !f.toggle}
						<KeyboardArrowRight></KeyboardArrowRight>
					{:else}
						<KeyboardArrowDown></KeyboardArrowDown>
					{/if}
				</KJVButton>
				<ShortText></ShortText>
				<span class="px-2 ps-1">{f['key']} </span>
			</p>
			{#if f.toggle}
				{@render footnoteItem(f)}
			{/if}
		</div>
	{/each}
{/snippet}

{#snippet footnoteItem(f: Footnote)}
	<p class="ps-10">
		{@html f['html']}
	</p>{/snippet}

{#snippet singleFootnote()}
	{#if footnotes.length === 1 && !hasCrossRef}
		<div class="flex flex-row items-center py-2">
			<span class="px-2">{footnotes[0]['key']} </span>

			<p class="ps-4">
				{@html footnotes[0]['html']}
			</p>
		</div>
	{/if}
{/snippet}

<!-- ============================== CONTAINER ============================== -->
{@render multipleFootnotes()}
{@render singleFootnote()}
