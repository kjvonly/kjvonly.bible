<script lang="ts">
	import { Pane } from '$lib/models/pane.model';
	import RecursivePane from '../../../../components/recursive-pane/recursive-pane.svelte';
import ChapterContainer from '../components/chapterContainer.svelte';

let pane = new Pane()
</script>

<div class="flex h-full w-full flex-col">
	<!-- <div class="max-h-[50%] h-full">
		<ChapterContainer></ChapterContainer>
	</div>
	<div class="max-h-[50%] h-full">
		<ChapterContainer></ChapterContainer>
	</div> -->

	<RecursivePane id="{pane.id}" bind:pane={pane}>
 
	</RecursivePane>
</div>
