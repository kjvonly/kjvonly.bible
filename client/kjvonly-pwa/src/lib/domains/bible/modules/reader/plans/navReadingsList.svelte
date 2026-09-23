<script lang="ts">
	import { BufferBody, BufferContainer, BufferHeader } from '$lib/application/ui';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import Close from '$lib/components/svgs/close.svelte';
	import type { BCV, BibleReadingNavigation } from '../../../models/bible.model';

	let {
		navReadings = $bindable<BibleReadingNavigation>(),
		showNavReadingsPopup = $bindable<boolean>(),
		bibleLocationRef = $bindable<string>()
	}: {
		navReadings: BibleReadingNavigation;
		showNavReadingsPopup: boolean;
		bibleLocationRef: string;
	} = $props();

	let clientHeight = $state(0);
	let headerHeight = $state(0);

	function rowClicked(event: Event, reading: BCV, index: number): void {
		event.stopPropagation();
		navReadings.currentNavReadingsIndex = index;
		bibleLocationRef = reading.bibleLocationRef;
		showNavReadingsPopup = false;
	}
</script>

<BufferContainer bind:clientHeight>
	<BufferHeader bind:headerHeight>
		<span class="flex-1"></span>
		<span></span>

		<span class="text-center">Readings</span>

		<KJVButton
			classes="flex-1 flex justify-end"
			onClick={() => {
				showNavReadingsPopup = false;
			}}
		>
			<Close classes=""></Close>
		</KJVButton>
	</BufferHeader>

	<BufferBody {clientHeight} {headerHeight} classes="border">
		<table class="table-fixed">
			<tbody>
				{#each navReadings.readings.bcvs as r, idx}
					<tr
						class="h-16 hover:cursor-pointer hover:bg-neutral-100"
						onclick={(event) => rowClicked(event, r, idx)}
					>
						<td class="w-0 ps-3 pe-3 text-right text-nowrap">{r.bookName}</td>
						<td>{r.chapter}:{r.verses}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</BufferBody>
</BufferContainer>
