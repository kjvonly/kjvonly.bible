<script lang="ts">
	import type {
		BibleParagraphMap
	} from '../../../models/bible-paragraphs.model';

	// =============================== BINDINGS ================================
	let {
		verseNumber = $bindable<number>(),
		bibleLocationRef = $bindable<string>(),
		paragraphs = $bindable<BibleParagraphMap>()
	}: {
		verseNumber: number;
		bibleLocationRef: string;
		paragraphs: BibleParagraphMap;
	} = $props();
</script>

<!-- Adds line break if bible location ref exists in the paragraph map. Paragraphs map are cleared if disabled. -->
{#if paragraphs[`${bibleLocationRef}_${verseNumber}_0`] && verseNumber !== 1}
	<br />
	<br />
{/if}
