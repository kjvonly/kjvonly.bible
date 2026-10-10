<script lang="ts">
	import {
		KJVBackButton,
		ViewBody,
		ViewHeader
	} from '$lib/application/ui';

	import {
		useNavigationEntryContext,
		useNavigationRuntimeContext,
		usePaneLayoutContext
	} from '$lib/application';
	import { KJVHeader } from '$lib/components';
	import type { BCV, BibleReadingNavigation } from '../../../models/bible.model';

	const paneLayout = usePaneLayoutContext();
	let clientHeight = $derived(
		paneLayout.clientHeight
	);

	const {
		navigationState
	} = useNavigationEntryContext();

	const {
		navigation
	} = useNavigationRuntimeContext();

	const navReadings = getNavReadings();

	let headerHeight = $state(0);

	/**
	 * Reads and validates the reading-list navigation payload owned by this view.
	 *
	 * The view requires the complete reading sequence plus the caller's current
	 * index so a selected row can be returned as an explicit navigation result.
	 */
	function getNavReadings(): BibleReadingNavigation {
		const value = navigationState.state.navReadings;

		if (
			typeof value !== 'object' ||
			value === null ||
			Array.isArray(value) ||
			typeof value.currentNavReadingsIndex !== 'number' ||
			typeof value.readings !== 'object' ||
			value.readings === null ||
			Array.isArray(value.readings) ||
			!Array.isArray(value.readings.bcvs)
		) {
			throw new Error(
				'Invalid Bible nav readings navigation state'
			);
		}

		return value as unknown as BibleReadingNavigation;
	}

	/**
	 * Returns the selected reading to the owning Reader and closes this view.
	 *
	 * @param event - Row click whose bubbling must not trigger surrounding UI.
	 * @param reading - Reading selected from the current navigation sequence.
	 * @param index - Position of the reading in the sequence.
	 */
	async function rowClicked(
		event: Event,
		reading: BCV,
		index: number
	): Promise<void> {
		event.stopPropagation();

		await navigation.backWithResult({
			type: 'bible-nav-reading',
			index,
			bibleLocationRef: reading.bibleLocationRef
		});
	}
</script>

<!--
@component
Displays the Reader's current navigation-reading sequence.

This view does not mutate Bible Reader state directly. Selecting a reading
returns `{ index, bibleLocationRef }` through `backWithResult(...)`; the owning
Reader applies the location and updates its reading-navigation cursor.
-->

{#snippet leadingContent()}
	<KJVBackButton></KJVBackButton>
{/snippet}

<ViewHeader bind:headerHeight>
	<KJVHeader
		title="Readings"
		{leadingContent}
	></KJVHeader>
</ViewHeader>

<ViewBody {clientHeight} {headerHeight} classes="border">
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
</ViewBody>
