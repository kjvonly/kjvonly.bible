<script lang="ts">
	import { paneService } from '$lib/services/pane.service.svelte';
	import { plansService } from '$lib/services/plans.service';
	import { onMount } from 'svelte';
	import uuid4 from 'uuid4';

	let { containerHeight, paneId } = $props();

	let readingSearchID = uuid4()

	function onGetAllSubs(data: any){
		console.log(data)
	}

	function onGetAllPlans(data: any){
		console.log(data)
	}

	let subID = ''

	onMount(()=>{
			plansService.subscribe('getAllPlans', onGetAllPlans);
			plansService.getAllPlans();

			plansService.subscribe('getAllSubs', onGetAllSubs);
			plansService.getAllSubs();			
	})

	let clientHeight = $state(0);
	let headerHeight = $state(0);
</script>

{#snippet today()}
	<div>
        no reading for today.

        Discover
    </div>
{/snippet}

<div bind:clientHeight style={containerHeight} class="overflow-hidden">
	<div class="flex flex-col items-center">
		<header
			bind:clientHeight={headerHeight}
			class="sticky top-0 w-full flex-col border-b-2 bg-neutral-100 text-neutral-700 md:max-w-lg"
		>
			<div class="flex w-full justify-end">
				<button
					aria-label="close"
					onclick={() => {
						paneService.onDeletePane(paneService.rootPane, paneId);
					}}
					class="h-12 w-12 px-2 pt-2 text-neutral-700"
				>
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
						<path
							class="fill-neutral-700"
							d="M12,2C6.47,2,2,6.47,2,12s4.47,10,10,10s10-4.47,10-10S17.53,2,12,2z M17,15.59L15.59,17L12,13.41L8.41,17L7,15.59 L10.59,12L7,8.41L8.41,7L12,10.59L15.59,7L17,8.41L13.41,12L17,15.59z"
						/>
					</svg>
				</button>
			</div>
		</header>

		<div class="flex w-full max-w-lg justify-center px-2 pt-2">{@render today()}</div>
	</div>
</div>
