<script lang="ts">
	// =============================== BINDINGS ================================
	let {
		verseNumber = $bindable(),
		bibleLocationRef = $bindable(),
		paragraphs = $bindable()
	} = $props();
</script>

<!-- Adds line break if bible location ref exists in the paragraph map. Paragraphs map are cleared if disabled. -->
{#if paragraphs && paragraphs[`${bibleLocationRef}_${verseNumber}_0`] && verseNumber !== 1}
	<br />
	<br />
{/if}
