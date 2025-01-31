<script lang="ts">
	let { word } = $props();

	function onWordClicked(e: Event, word: any){
		e.stopPropagation()
		alert(JSON.stringify(word))
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
&nbsp;<span onclick={(e) => {onWordClicked(e, word)}} class="inline-block {word.class?.join(' ')}">{word.text}</span>

<style>


	/* TODO: Decide if supporting footnotes. */
	.FOOTNO {
		vertical-align: baseline;
		position: relative;
		top: -0.6em;
		@apply -z-10 text-base text-neutral-700 me-2 ;
	}

	.redtxt {
		@apply text-redtxt;
	}

	u {
		text-decoration: none;
	}

	.vno {
		vertical-align: baseline;
		position: relative;
		top: -0.6em;
		@apply -z-10 text-xs text-neutral-700;
	}

	.xref {
		@apply underline decoration-dotted;
		cursor: pointer;
	}
</style>
