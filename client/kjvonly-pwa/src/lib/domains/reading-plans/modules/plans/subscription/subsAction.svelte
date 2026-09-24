<script lang="ts">
	// ================================ IMPORTS ================================
	// APPLICATION
	import type { NavigationComponentProps } from '$lib/application';
	import { BufferBody, BufferHeader } from '$lib/application/ui';

	// COMPONENTS
	import ActionItemsList from '../components/actionItemsList.svelte';
	import Discover from '../discover/discover.svelte';
	import NextReadings from '../nextReadings/nextReadings.svelte';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';

	// SVGS
	import ArrowBack from '$lib/components/svgs/arrowBack.svelte';

	// =============================== BINDINGS ================================

	let {
		clientHeight,
		navService
	}: NavigationComponentProps = $props();

	// ================================== VARS =================================
	let headerHeight: number = $state(0);

	const subsActionItems: Record<string, () => void> = {
		plans: () => {
			navService.pop();
			navService.push({
				component: Discover,
				obj: {}
			});
		},
		'next readings': () => {
			navService.pop();
			navService.push({
				component: NextReadings,
				obj: {}
			});
		}
	};
</script>

<!-- ================================ HEADER =============================== -->
{#snippet header()}
	<div class="grid w-full grid-cols-5 place-items-center">
		<span class="flex w-full">
			<KJVButton classes="" onClick={() => navService.pop()}>
				<ArrowBack></ArrowBack>
			</KJVButton>
			<span class="flex-1"></span>
		</span>
	</div>
{/snippet}

<!-- ================================= BODY ================================ -->
{#snippet body()}
	<ActionItemsList actionItems={subsActionItems}></ActionItemsList>
{/snippet}

<!-- ============================== CONTAINER ============================== -->
<BufferHeader bind:headerHeight>
	{@render header()}
</BufferHeader>
<BufferBody {clientHeight} {headerHeight} classes="">
	{@render body()}
</BufferBody>
