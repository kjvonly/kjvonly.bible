<script lang="ts">
	let { containerHeight, notePopup = $bindable() } = $props();
	let clientHeight = $state(0);
	let headerHeight = $state(0);
</script>

<div
	bind:clientHeight
	style={containerHeight}
	class="flex h-full w-full flex-col items-center bg-neutral-50"
>
	<header
		bind:clientHeight={headerHeight}
		class=" w-full max-w-lg flex-row bg-neutral-100 text-neutral-700"
	>
		<button
			onclick={() => {
				notePopup = false;
			}}
			class="float-end px-2 pt-2 text-neutral-700">Cancel</button
		>
	</header>

	<div
		style="height: {clientHeight - headerHeight}px"
		class="flex w-full max-w-lg flex-col overflow-y-scroll border"
	>
		<p>notes</p>
	</div>
</div>
