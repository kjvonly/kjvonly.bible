<!-- @component
Renders pericope headings attached to the active verse. The chapter owns loading/settings behavior and clears the map when pericope presentation is disabled.
-->
<script lang="ts">
	import type {
		BiblePericopeMap
	} from '../../../models/bible-pericopes.model';

	// =============================== BINDINGS ================================
	interface Props {
		/** Verse whose pericope headings are being rendered. */
		verseNumber: number;
		/** Active chapter/location prefix used to address pericope metadata. */
		bibleLocationRef: string;
		/** Installed pericope map for the active chapter. */
		pericopes: BiblePericopeMap;
	}

	let {
		verseNumber = $bindable<number>(),
		bibleLocationRef = $bindable<string>(),
		pericopes = $bindable<BiblePericopeMap>()
	}: Props = $props();
</script>

<!-- Pericope headings are presentation metadata owned by the active chapter resource. -->
{#each pericopes[`${bibleLocationRef}_${verseNumber}`] ?? [] as pericope}
	<div class="pericope italic">{pericope.text}</div>
{/each}
