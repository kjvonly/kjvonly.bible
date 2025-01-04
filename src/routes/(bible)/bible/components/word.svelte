<script lang="ts">
	let { word } = $props();
</script>

<span class="inline-block pr-1 {word.class?.join(' ')}">{word.text}</span>

<style>
	u.FOOTNO + u.whitespace {
		display: none;
	}

	/* TODO: Decide if supporting footnotes. */
	.FOOTNO {
		display: none;
		width: 0px !important;
	}

	.redtxt {
		@apply text-red-500;
	}

	u {
		text-decoration: none;
	}

	.vno {
		vertical-align: baseline;
		position: relative;
		top: -0.6em;
        @apply text-xs text-gray-500 -z-10
	}

	u.xref {
		text-decoration: underline dotted darkgray;
		cursor: pointer;
	}
</style>
