<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onMount } from 'svelte';

	// COMPONENTS
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';

	// SVG
	import Asterisk from '$lib/components/svgs/asterisk.svelte';
	import KeyboardArrowDown from '$lib/components/svgs/keyboardArrowDown.svelte';
	import KeyboardArrowRight from '$lib/components/svgs/keyboardArrowRight.svelte';

	// OTHERS
	import { numberToAlphabeticSequence } from '$lib/shared';

	// =============================== BINDINGS ================================

	let {
		collapsible,
		footnotes: footnotesByID,
		chapterFootnotes
	}: {
		collapsible: boolean;
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
	}

	// ================================ FUNCS ==================================
	function setFootnotes(): void {
		footnotesByID.forEach((footnoteRef) => {
			const key = footnoteRef.split('_')[2];
			const footnoteNumber = Number(key);

			if (!Number.isInteger(footnoteNumber) || footnoteNumber < 1) {
				return;
			}

			footnotes.push({
				key: numberToAlphabeticSequence(footnoteNumber),
				html: chapterFootnotes[key]
			});
		});
	}

	// ============================== CLICK FUNCS ==============================

	function onToggleFootnotes(): void {
		toggle = !toggle;
	}
</script>

<!-- ================================ HEADER =============================== -->

{#snippet footnotesHeader()}
	<div class="flex flex-row items-center">
		{#if collapsible}
			<KJVButton classes="" onClick={onToggleFootnotes}>
				{#if !toggle}
					<KeyboardArrowRight></KeyboardArrowRight>
				{:else}
					<KeyboardArrowDown></KeyboardArrowDown>
				{/if}
			</KJVButton>
		{/if}
		<Asterisk></Asterisk>
		<p class="ps-1 pe-4 capitalize">footnotes</p>
	</div>
{/snippet}

<!-- ================================= BODY ================================ -->
{#snippet footnoteList()}
	<div class="flex flex-col">
		{#each footnotes as f}
			<div class="flex flex-row py-2 ps-2">
				<span class="px-2">{f.key}</span>
				<p class="ps-4">
					{@html f.html}
				</p>
			</div>
		{/each}
	</div>
{/snippet}

<!-- ============================== CONTAINER ============================== -->
{#if collapsible || footnotes.length > 1}
	{@render footnotesHeader()}
{/if}
{#if !collapsible || toggle}
	{@render footnoteList()}
{/if}
