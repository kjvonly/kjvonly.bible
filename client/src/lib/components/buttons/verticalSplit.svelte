<script lang="ts">
	import { paneService } from '$lib/services/pane.service.svelte';

	let { paneID = $bindable(), module, data, classes = 'h-8 w-8' } = $props();
</script>

<button
	aria-label="horizontal split"
	onclick={(e) => {
		e.stopPropagation();
		paneService.onSplitPane(paneID, 'v', module, data);
	}}
>
	<svg
		class="{classes} hover:cursor-pointer"
		version="1.1"
		id="svg2"
		width="100%"
		height="100%"
		viewBox="0 0 94.018994 99.168052"
		xmlns="http://www.w3.org/2000/svg"
	>
		<g class="" id="g8" transform="translate(-16.898488,-13.804183)">
			<rect
				style="stroke-width:5;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:1"
				class="fill-none stroke-neutral-400"
				id="rect2158"
				width="90"
				height="42.665619"
				x="-105.81368"
				y="18.907988"
				transform="rotate(-90)"
			/>
			<rect
				style="stroke-width:5;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:1"
				class="fill-none stroke-neutral-400"
				id="rect2330"
				width="90"
				height="42.665619"
				x="-105.81368"
				y="70.164314"
				transform="rotate(-90)"
			/>
		</g>
	</svg>
</button>
