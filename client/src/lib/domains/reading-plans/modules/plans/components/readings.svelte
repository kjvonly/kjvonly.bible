<script lang="ts">
	import type { BCV } from '$lib/models/bible.model';

	let { readings = $bindable<BCV[]>() } = $props();
</script>

<table class="table-fixed">
	<tbody>
		{#each readings as r}
			<tr>
				<td class="pe-3 text-right text-nowrap">{r.bookName}</td>
				<td class="text-right">{r.chapter}:{r.verses}</td>
			</tr>
		{/each}
	</tbody>
</table>
