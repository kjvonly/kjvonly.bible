<script lang="ts">
	import type {
		Snippet
	} from 'svelte';

	import type {
		KJVExpandableActionClusterItem
	} from './expandable-action-cluster.model';

	let {
		items,
		label,
		expandLabel = `expand ${label}`,
		itemContent,
		collapsedPrimaryId,
		collapseAfterSelect = true,
		collapsedOverlapClass = '-ml-4',
		expandedGapClass = 'gap-2'
	}: {
		items: readonly KJVExpandableActionClusterItem[];
		label: string;
		expandLabel?: string;
		itemContent: Snippet<[KJVExpandableActionClusterItem]>;
		collapsedPrimaryId?: string;
		collapseAfterSelect?: boolean;
		collapsedOverlapClass?: string;
		expandedGapClass?: string;
	} = $props();

	let expanded = $state(false);

	/**
	 * Keeps a preferred action visually on top of the collapsed stack without
	 * changing the expanded action order.
	 */
	let collapsedItems = $derived.by(() => {
		if (!collapsedPrimaryId) {
			return items;
		}

		const primary = items.find(
			(item) => item.id === collapsedPrimaryId
		);

		if (!primary) {
			return items;
		}

		return [
			primary,
			...items.filter(
				(item) => item.id !== collapsedPrimaryId
			)
		];
	});

	/** Runs one action and restores the compact presentation when requested. */
	function selectItem(
		item: KJVExpandableActionClusterItem
	): void {
		item.onSelect();

		if (collapseAfterSelect) {
			expanded = false;
		}
	}
</script>

<div
	class="flex h-8 shrink-0 items-center"
	role="group"
	aria-label={label}
>
	{#if expanded}
		<div class="flex h-8 items-center {expandedGapClass}">
			{#each items as item (item.id)}
				<button
					type="button"
					onclick={() => selectItem(item)}
					aria-label={item.label}
					aria-pressed={item.pressed}
					class="h-8 w-8 shrink-0 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
				>
					{@render itemContent(item)}
				</button>
			{/each}
		</div>
	{:else}
		<button
			type="button"
			onclick={() => (expanded = true)}
			aria-label={expandLabel}
			aria-expanded={expanded}
			class="flex h-8 shrink-0 items-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
		>
			{#each collapsedItems as item, index (item.id)}
				<span
					class="relative block h-8 w-8 shrink-0 transition-all duration-200 ease-out {index === 0
						? ''
						: collapsedOverlapClass}"
					style={`z-index: ${collapsedItems.length - index}`}
				>
					{@render itemContent(item)}
				</span>
			{/each}
		</button>
	{/if}
</div>
