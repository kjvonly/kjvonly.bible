<script lang="ts">
	let { text, fn, base } = $props();
</script>

{#if base}
	<button
		onclick={() => fn()}
		class="inline-block rounded bg-primary-600 px-8 py-3 text-sm font-medium text-white transition hover:scale-110 hover:shadow-xl focus:outline-none focus:ring active:bg-primary-500"
	>
    {text}
	</button>
{:else}
	<!-- Border -->

	<button
		onclick={() => fn()}
		class="inline-block rounded border border-current px-8 py-3 text-sm font-medium bg-primary-600 transition hover:scale-110 hover:shadow-xl focus:outline-none focus:ring active:text-primary-500"
	>
    {text}
	</button>
{/if}
