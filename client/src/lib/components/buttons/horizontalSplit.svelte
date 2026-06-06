<script lang="ts">
	import { paneService } from '$lib/services/pane.service.svelte';

	let { paneID = $bindable(), module, data, classes = 'h-8 w-8' } = $props();
</script>

<button
	aria-label="horizontal split"
	onclick={(e) => {
		e.stopPropagation();
		paneService.onSplitPane(paneID, 'h', module, data);
	}}
>
	<svg
		class="{classes} hover:cursor-pointer"
		version="1.1"
		width="100%"
		height="100%"
		viewBox="0 0 94.018994 99.168052"
		xmlns="http://www.w3.org/2000/svg"
	>
		<g id="g8" transform="translate(-16.573607,-13.492392)">
			<rect
				style="stroke-width:5;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:1"
				class="fill-none stroke-neutral-400"
				width="90"
				height="42.665619"
				x="-108.58311"
				y="-58.167511"
				transform="scale(-1)"
			/>
			<rect
				style="stroke-width:5;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:1"
				class="fill-none stroke-neutral-400"
				width="90"
				height="42.665619"
				x="-108.58311"
				y="-110.65095"
				transform="scale(-1)"
			/>
		</g>
	</svg>
</button>
