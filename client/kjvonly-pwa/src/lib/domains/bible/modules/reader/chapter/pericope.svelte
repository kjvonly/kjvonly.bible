<script lang="ts">
	import type {
		BiblePericopeMap
	} from '../../../models/bible-pericopes.model';

	// =============================== BINDINGS ================================
	let {
		verseNumber = $bindable<number>(),
		bibleLocationRef = $bindable<string>(),
		pericopes = $bindable<BiblePericopeMap>()
	}: {
		verseNumber: number;
		bibleLocationRef: string;
		pericopes: BiblePericopeMap;
	} = $props();
</script>

<!-- Adds pericope headings for the current Bible location. Pericopes are cleared if disabled. -->
{#each pericopes[`${bibleLocationRef}_${verseNumber}`] ?? [] as pericope}
	<div class="pericope italic">{pericope.text}</div>
{/each}
