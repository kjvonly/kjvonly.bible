<script lang="ts">
	let {
		title = $bindable(),
		onClose,
		menuDropdownToggleViews,
		plansDisplay = $bindable(),
        headerHeight =$bindable()
	} = $props();
	
</script>

<header
	bind:clientHeight={headerHeight}
	class="flex w-full max-w-lg flex-row items-center justify-between bg-neutral-100 text-neutral-700"
>
	<span class="flex w-full"></span>

	{#if menuDropdownToggleViews}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<p
			onclick={() => {
				if (plansDisplay === menuDropdownToggleViews[0]) {
					plansDisplay = menuDropdownToggleViews[1];
				} else {
					plansDisplay = menuDropdownToggleViews[0];
				}
			}}
			class="flex flex-row items-center space-x-2 hover:cursor-pointer"
		>
			<span class="inline-block font-bold text-nowrap">{title}</span>
			<button aria-label="chevron down" class="h-4 w-4 hover:cursor-pointer">
				<svg
					width="100%"
					height="100%"
					viewBox="0 0 25.4 14.098638"
					version="1.1"
					xml:space="preserve"
					xmlns="http://www.w3.org/2000/svg"
					><g transform="translate(-53.644677,-127.79211)"
						><path
							class="fill-neutral-700"
							style="stroke-width:0.352778"
							d="m 59.906487,137.65245 -6.26181,-4.21622 v -2.82206 -2.82206 l 6.35,4.24282 6.35,4.24283 6.35,-4.24283 6.35,-4.24282 v 2.82222 2.82222 l -6.3429,4.23808 c -3.48859,2.33094 -6.38578,4.22817 -6.43819,4.21606 -0.0524,-0.0121 -2.91311,-1.91931 -6.3571,-4.23824 z"
							id="path179"
						/></g
					></svg
				>
			</button>
		</p>
	{:else}
		<span class="w-full text-center">{title}</span>
	{/if}
	{#if onClose}
		<div class="flex w-full justify-end">
			<button
				aria-label="close"
				onclick={() => {
					onClose();
				}}
				class="h-12 w-12 px-2 pt-2 text-neutral-700 hover:cursor-pointer"
			>
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
					<path
						class="fill-neutral-700"
						d="M12,2C6.47,2,2,6.47,2,12s4.47,10,10,10s10-4.47,10-10S17.53,2,12,2z M17,15.59L15.59,17L12,13.41L8.41,17L7,15.59 L10.59,12L7,8.41L8.41,7L12,10.59L15.59,7L17,8.41L13.41,12L17,15.59z"
					/>
				</svg>
			</button>
		</div>
	{:else}
		<span class="flex h-12 w-12 w-full justify-end"></span>
	{/if}
</header>
