<script lang="ts">
	import {
		type NavigationState,
		useNavigationRuntimeContext
	} from '$lib/application';
	import type { StrongsPopups } from '$lib/domains/strongs';
	// ================================ IMPORTS ================================
	// COMPONENTS
	import Close from '$lib/components/svgs/close.svelte';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import PopupContainer from './popups/popupContainer.svelte';
	import SearchPopup from './popups/searchPopup/searchPopup.svelte';
	const { navigation } = useNavigationRuntimeContext();

	// SERVICES

	// =============================== BINDINGS ================================

	let {
		clientHeight,
		navigationState,
		popups = $bindable<StrongsPopups>()
	}: {
		clientHeight: number;
		navigationState: NavigationState;
		popups: StrongsPopups;
	} = $props();

	// ============================== CLICK FUNCS ==============================

	function onClose(e: Event): void {
		e.stopPropagation();
		navigation.back();
	}
</script>

<!-- ================================ HEADER =============================== -->
{#snippet header()}
	<div
		class="flex w-full flex-row bg-neutral-100 py-2 leading-tight"
	>
		<span class="flex-1"></span>
		<span class="text-center">Strongs / Refs</span>
		<div class="flex flex-1 justify-end pe-4">
			<KJVButton onClick={onClose} classes="">
				<Close classes=""></Close>
			</KJVButton>
		</div>
	</div>
{/snippet}

<!-- ================================ POPUPS =============================== -->

{#snippet searchPopup()}
	{#if popups.searchPopup}
		<PopupContainer {clientHeight}>
			<SearchPopup bind:popups {navigationState}></SearchPopup>
		</PopupContainer>
	{/if}
{/snippet}

<!-- ============================== CONTAINER ============================== -->
{@render header()}
{@render searchPopup()}
