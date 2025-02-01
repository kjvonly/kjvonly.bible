<script lang="ts">
	import RecursivePane from './recursive-pane.svelte';
	import { retry, handleAll, ConstantBackoff } from 'cockatiel';
	import type { Pane } from '$lib/models/pane.model';
	import { onMount } from 'svelte';

	let { id, pane = $bindable<Pane>() } = $props();

	function resizeRow(resizeId: string, leftId: string, rightId: string, containerId: string) {
		var resize = document.querySelector(resizeId) as HTMLElement;
		var top = document.querySelector(leftId) as HTMLElement;
		var bottom = document.querySelector(rightId) as HTMLElement;
		var container = document.querySelector(containerId) as HTMLElement;

		if (resize === null || top === null || bottom === null || container === null) {
			throw `DOM NOT RENDERED YET FOR ${id}`;
		}

		top.style.height = pane.leftPercentage;
		bottom.style.height = pane.rightPercentage;
		var h: number;

		var drag = false;

		function mouseMove(e: MouseEvent | any) {
			if (drag) {
				var moveY = e.y;
				var rect = container ? container.getBoundingClientRect() : new DOMRect();
				h = ((moveY - rect.y) / rect.height) * 100;
				top.style.height = h + '%';
				bottom.style.height = 100 - h + '%';
			}
		}

		resize.addEventListener('mousedown', function (e: MouseEvent | any) {
			drag = true;
			container.addEventListener('mousemove', mouseMove);
		});

		container.addEventListener('mouseup', function (e: MouseEvent) {
			drag = false;
			container.removeEventListener('mousemove', mouseMove);
			pane.leftPercentage = h + '%';
			pane.rightPercentage = 100 - h + '%';
		});
	}

	function registerResize() {
		resizeRow(
			`#_${id}-horizontal-resize`,
			`#_${id}-horizontal-left`,
			`#_${id}-horizontal-right`,
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
				1000
			);
		})();
	});
</script>

<div id="_{id}-horizontal-left" class="w-[100%] h-[50%]">
	{#if pane}
		{#if pane.leftPane}
			<RecursivePane  bind:pane={pane.leftPane} />
		{/if}
	{/if}
</div>
<div class="horizontal-resize-container">
	<div id="_{id}-horizontal-resize" class="horizontal-resize"></div>
</div>

<div id="_{id}-horizontal-right" class="w-[100%] h-[50%]">
	{#if pane}
		{#if pane.rightPane}
			<RecursivePane bind:pane={pane.rightPane} />
		{/if}
	{/if}
</div>
