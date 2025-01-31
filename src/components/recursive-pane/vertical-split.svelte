<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';

	import type { Pane } from '$lib/models/pane.model';
	import RecursivePane from './recursive-pane.svelte';
	import { retry, handleAll, ConstantBackoff } from 'cockatiel';
	
	let { id,  pane = $bindable<Pane>() } = $props();

	function resizeCol(resizeId: string, leftId: string, rightId: string, containerId: string) {
		var resize = document.querySelector(resizeId) as HTMLElement;
		var left = document.querySelector(leftId) as HTMLElement;
		var right = document.querySelector(rightId) as HTMLElement;
		var container = document.querySelector(containerId) as HTMLElement;

		if (resize === null || left === null || right === null || container === null) {
			throw `DOM NOT RENDERED YET FOR ${id}`;
		}

		left.style.width = pane.leftPercentage;
		right.style.width = pane.rightPercentage;

		var drag = false;
		var l: number;

		function mouseMove(e: MouseEvent | any) {
			if (drag) {
				var moveX = e.x;
				var rect = container ? container.getBoundingClientRect() : new DOMRect();
				l = ((moveX - rect.x) / rect.width) * 100;
				left.style.width = l + '%';
				right.style.width = 100 - l + '%';
			}
		}

		resize.addEventListener('mousedown', function (e: MouseEvent | any) {
			drag = true;
			container.addEventListener('mousemove', mouseMove);
		});

		container.addEventListener('mouseup', function (e: MouseEvent) {
			drag = false;
			container.removeEventListener('mousemove', mouseMove);
			pane.leftPercentage = l + '%';
			pane.rightPercentage = 100 - l + '%';

		});
	}

	function registerResize() {
		resizeCol(
			`#_${id}-vertical-resize`,
			`#_${id}-vertical-left`,
			`#_${id}-vertical-right`,
			`#_${id}-pane`
		);
	}

	onMount(() => {
		// Register EventListeners
		const retryPolicy = retry(handleAll, { maxAttempts: 500, backoff: new ConstantBackoff(500) });
		(() => {
			setTimeout(
				() =>
					retryPolicy
						.execute(() => registerResize())
						.catch((reason) => console.log(reason, 'could not register app listeners for pane')),
				500
			);
		})();
	});
</script>

<div id="_{id}-vertical-left" class="w-[50%]">
	{#if pane}
		{#if pane.leftPane}
			<RecursivePane {id} bind:pane={pane.leftPane} />
		{/if}
	{/if}
</div>
<div class="vertical-resize-container">
	<div id="_{id}-vertical-resize" class="vertical-resize"></div>
</div>
<div id="_{id}-vertical-right" class="flex flex-row w-[50%]">
	{#if pane}
		{#if pane.rightPane}
			<RecursivePane {id} bind:pane={pane.rightPane}/>
		{/if}
	{/if}
</div>

<style>
</style>
