<script lang="ts">
	import {
		KJVExpandableActionCluster,
		type KJVExpandableActionClusterItem
	} from '$lib/components/actions';

	let selected = $state('');

	const items: readonly KJVExpandableActionClusterItem[] = [
		{
			id: 'first',
			label: 'first action',
			onSelect: () => {
				selected = 'first';
			}
		},
		{
			id: 'second',
			label: 'second action',
			onSelect: () => {
				selected = 'second';
			}
		}
	] as const;
</script>

{#snippet itemContent(item: KJVExpandableActionClusterItem)}
	<span data-action-icon={item.id}>{item.id}</span>
{/snippet}

<KJVExpandableActionCluster
	{items}
	label="test actions"
	expandLabel="expand test actions"
	{itemContent}
	collapsedPrimaryId="second"
></KJVExpandableActionCluster>

<span data-selected-action>{selected}</span>
