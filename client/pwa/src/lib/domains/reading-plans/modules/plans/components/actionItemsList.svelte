<script lang="ts">
	let { actionItems }: {
		actionItems: Record<string, () => void>;
	} = $props();
</script>

<div class="flex w-full flex-col">
	{#each Object.keys(actionItems) as a}
		<button
			onclick={() => actionItems[a]()}
			class="flex w-full bg-neutral-50 p-4 text-start capitalize hover:bg-neutral-100"
			>{a}</button
		>
	{/each}
</div>
