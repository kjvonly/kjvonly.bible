<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	// COMPONENTS
	import BufferBody from '$lib/application/runtime/buffer/components/bufferBody.svelte';
	import BufferContainer from '$lib/application/runtime/buffer/components/bufferContainer.svelte';
	import BufferHeader from '$lib/application/runtime/buffer/components/bufferHeader.svelte';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import AddCircle from '$lib/components/svgs/addCircle.svelte';
	import ArrowBack from '$lib/components/svgs/arrowBack.svelte';
	import ReadingsComponent from '../components/readings.svelte';
	// MODELS
	import {
		CachedPlanToCachedSub,
		PLANS_VIEWS,
		PlanToCachedSub,
		type Plan
	} from '$lib/domains/reading-plans/models/plans.model';
	// SERVICES
	import { toastService } from '$lib/application/services/toast.service';
	import uuid4 from 'uuid4';
	import { sleep } from '$lib/infrastructure/utils/sleep';
	import { onMount } from 'svelte';
	import { subsApi } from '$lib/nostr/events/subs.nostr';
	import { plansPubSubService } from '$lib/domains/reading-plans/services/plansPubSub.service';
	// =============================== BINDINGS ================================
	let {
		plansDisplay = $bindable<PLANS_VIEWS>(),
		selectedPlan = $bindable<Plan>()
	}: {
		plansDisplay: PLANS_VIEWS;

		selectedPlan: Plan;
	} = $props();
	// ================================== VARS =================================
	let clientHeight: number = $state(0);
	let headerHeight: number = $state(0);
	let readingsToShow: number = $state(0);
	let discoverDetailID = uuid4();

	// =============================== LIFECYCLE ===============================
	onMount(() => {
		loadMoreReadings();
		setTimeout(async () => {
			let el = document.getElementById(`${discoverDetailID}-scroll-container`);
			let retriesMax = 10;
			let count = 0;
			while (!el && count != retriesMax) {
				el = document.getElementById(`${discoverDetailID}-scroll-container`);
				await sleep(1000);
				count++;
			}

			if (count === 10) {
				return;
			}

			el?.addEventListener('scroll', handleScroll);
		}, 1000);
	});
	// ================================ FUNCS ==================================

	function loadMoreReadings() {
		let toShow = 0;
		let count = 0;
		const BATCH_SIZE_TO_SHOW = 30;

		while (
			toShow !== BATCH_SIZE_TO_SHOW &&
			count + readingsToShow < selectedPlan.nestedReadings.length
		) {
			toShow = toShow + 1;
			count++;
		}

		readingsToShow += count;
	}

	function handleScroll() {
		let el = document.getElementById(`${discoverDetailID}-scroll-container`);
		if (el === null) {
			return;
		}

		const threshold = 20; // Adjust this value as needed
		const isReachBottom =
			el.scrollHeight - el.clientHeight - el.scrollTop <= threshold;

		if (isReachBottom) {
			loadMoreReadings();
		}
	}

	// ============================== CLICK FUNCS ==============================
	function onBackClicked() {
		plansDisplay = PLANS_VIEWS.PLANS_LIST;
	}

	async function onAddPlanClicked() {
		toastService.showToast('Plan added to My Plans');
		plansDisplay = PLANS_VIEWS.SUBS_LIST;
		let s = PlanToCachedSub(JSON.parse(JSON.stringify(selectedPlan)));
		await subsApi.put(s);
		plansPubSubService.putSub(s);
	}
</script>

<!-- ================================ HEADER =============================== -->
{#snippet header()}
	<span class="flex-1">
		<KJVButton classes="" onClick={onBackClicked}>
			<ArrowBack></ArrowBack>
		</KJVButton>
	</span>

	<span class="text-cetner">Plan Details</span>
	<span class="flex flex-1 justify-end">
		<KJVButton classes="" onClick={onAddPlanClicked}>
			<AddCircle></AddCircle>
		</KJVButton>
	</span>
{/snippet}
<!-- ================================= BODY ================================ -->
{#snippet body()}
	<div class="pb-3 text-2xl">{selectedPlan?.name}</div>
	<div>{selectedPlan?.description}</div>

	{#each Array(readingsToShow) as _, idx}
		<div class="flex w-full min-w-50 p-4">
			<div class="flex flex-1 items-center">
				<span class="">Reading {idx + 1}</span>
			</div>
			<span class="flex"></span>
			<ReadingsComponent bind:readings={selectedPlan.nestedReadings[idx].bcvs}
			></ReadingsComponent>
		</div>
	{/each}
{/snippet}
<!-- ============================== CONTAINER ============================== -->
<BufferContainer bind:clientHeight>
	<BufferHeader bind:headerHeight>
		{@render header()}
	</BufferHeader>
	<BufferBody ID={discoverDetailID} bind:clientHeight bind:headerHeight>
		{@render body()}
	</BufferBody>
</BufferContainer>
