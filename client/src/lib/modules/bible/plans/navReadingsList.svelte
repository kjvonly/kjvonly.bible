<script lang="ts">
	import type { NavReadings } from '../../../models/plans.model';

	let {
		navReadings = $bindable(),
		showNavReadingsPopup = $bindable(),
		bibleLocationRef = $bindable()
	} = $props();

	let clientHeight = $state(0);
	let headerHeight = $state(0);
	let clientWidth = $state(0);

	function rowClicked(e: any, r: any, idx: number) {
		e.stopPropagation();
		let nr: NavReadings = navReadings;
		nr.currentNavReadingsIndex = idx;
		bibleLocationRef = r.bibleLocationRef;
		showNavReadingsPopup = false;
	}
</script>

<div bind:clientHeight class="flex h-full w-full justify-center bg-neutral-50">
	<div class="w-full md:max-w-lg">
		<header
			bind:clientHeight={headerHeight}
			class="items-between sticky top-0 flex w-full border-b-2 bg-neutral-100 text-neutral-700"
		>
			<span class="flex w-full"></span>
			<div class="flex w-full items-center justify-center">Readings</div>
			<div class="flex w-full justify-end">
				<button
					aria-label="close"
					onclick={() => {
						showNavReadingsPopup = false;
					}}
					class="h-12 w-12 px-2 text-neutral-700"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						width="100%"
						height="100%"
					>
						<path
							class="fill-neutral-700"
							d="M12,2C6.47,2,2,6.47,2,12s4.47,10,10,10s10-4.47,10-10S17.53,2,12,2z M17,15.59L15.59,17L12,13.41L8.41,17L7,15.59 L10.59,12L7,8.41L8.41,7L12,10.59L15.59,7L17,8.41L13.41,12L17,15.59z"
						/>
					</svg>
				</button>
			</div>
		</header>

		<div
			bind:clientWidth
			style="height: {clientHeight - headerHeight}px"
			class="flex w-full flex-col overflow-y-scroll border"
		>
			<table class="table-fixed">
				<tbody>
					{#each navReadings.readings.bcvs as r, idx}
						<tr
							class="h-16 hover:cursor-pointer hover:bg-neutral-100"
							onclick={(event) => rowClicked(event, r, idx)}
						>
							<td class="w-0 ps-3 pe-3 text-right text-nowrap">{r.bookName}</td>
							<td class="">{r.chapter}:{r.verses}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
