<script lang="ts">
	let { actionItems } = $props();
</script>

<div class="flex w-full flex-col">
	{#each Object.keys(actionItems) as a}
		<button
			onclick={(event) => actionItems[a]()}
			class="flex w-full bg-neutral-50 p-4 text-start capitalize hover:bg-neutral-100"
			>{a}</button
		>
	{/each}
</div>
