<script lang="ts">
	// =============================== BINDINGS ================================
	let {
		verseNumber = $bindable(),
		bibleLocationRef = $bindable(),
		pericopes = $bindable()
	} = $props();
</script>

<!-- Adds line break if bible location ref exists in the paragraph map. Paragraphs map are cleared if disabled. -->
{#if pericopes && pericopes[`${bibleLocationRef}_${verseNumber}`]}
	{#each pericopes[`${bibleLocationRef}_${verseNumber}`] as p}
		<div class="pericope italic">{p.text}</div>
	{/each}
{/if}
