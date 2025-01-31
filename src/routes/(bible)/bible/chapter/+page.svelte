<script lang="ts">
	import { Pane, PaneSplit } from '$lib/models/pane.model';
	import RecursivePane from '../../../../components/recursive-pane/recursive-pane.svelte';
	import ChapterContainer from '../components/chapterContainer.svelte';

	let pane = new Pane();

	pane.split = PaneSplit.Horizontal;

	pane.leftPane = new Pane();
	pane.leftPane.split=  PaneSplit.Vertical
	pane.leftPane.leftPane = new Pane()
	pane.leftPane.rightPane = new Pane()
	pane.rightPane = new Pane();

	pane.rightPane.split=  PaneSplit.Vertical
	pane.rightPane.leftPane = new Pane()
	pane.rightPane.rightPane = new Pane()
	
</script>

<div class="flex h-full w-full flex-col">
	<!-- <div class="max-h-[50%] h-full">
		<ChapterContainer></ChapterContainer>
	</div>
	<div class="max-h-[50%] h-full">
		<ChapterContainer></ChapterContainer>
	</div> -->

	<RecursivePane id={pane.id} bind:pane></RecursivePane>
</div>
