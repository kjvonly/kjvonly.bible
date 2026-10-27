<script lang="ts">
	import {
		KJVExpandableActionCluster,
		type KJVExpandableActionClusterItem
	} from '$lib/components/actions';

	const colorIDs = ['a', 'b', 'c', 'd', 'e'] as const;
	type ColorID = (typeof colorIDs)[number];

	let selected = $state<ColorID>('c');

	let items = $derived.by(
		() =>
			colorIDs.map(
				(color): KJVExpandableActionClusterItem => ({
					id: color,
					label: `select color ${color}`,
					pressed: selected === color,
					onSelect: () => {
						selected = color;
					}
				})
			)
	);
</script>

{#snippet colorSwatch(item: KJVExpandableActionClusterItem)}
	<span
		data-color-swatch={item.id}
		class="block h-full w-full rounded-full"
	></span>
{/snippet}

<KJVExpandableActionCluster
	{items}
	label="markup color picker"
	expandLabel="expand colors"
	itemContent={colorSwatch}
	collapsedPrimaryId={selected}
	collapsedOverlapClass="-ml-6"
></KJVExpandableActionCluster>

<span data-selected-color>{selected}</span>
