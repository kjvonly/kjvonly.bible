<!-- @component
Renders paragraph spacing for the active verse from the installed paragraph presentation map. The chapter clears the map when paragraph presentation is disabled.
-->
<script lang="ts">
	import type {
		BibleParagraphMap
	} from '../../../models/bible-paragraphs.model';

	// =============================== BINDINGS ================================
	interface Props {
		/** Verse whose paragraph boundary is being rendered. */
		verseNumber: number;
		/** Active chapter/location prefix used to address paragraph metadata. */
		bibleLocationRef: string;
		/** Installed paragraph boundary map for the active chapter. */
		paragraphs: BibleParagraphMap;
	}

	let {
		verseNumber = $bindable<number>(),
		bibleLocationRef = $bindable<string>(),
		paragraphs = $bindable<BibleParagraphMap>()
	}: Props = $props();
</script>

<!-- Paragraph boundaries are expressed as spacing before the addressed verse. -->
{#if paragraphs[`${bibleLocationRef}_${verseNumber}_0`] && verseNumber !== 1}
	<br />
	<br />
{/if}
