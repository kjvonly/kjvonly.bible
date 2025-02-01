<script lang="ts">
	import { Pane, PaneSplit } from '$lib/models/pane.model.svelte';
	import { newChapterSettings, type ChapterSettings } from '../models/chapterSettings';
	import { onMount } from 'svelte';
	import RecursivePane from '../../../../components/recursive-pane/recursive-pane.svelte';
	import ChapterContainer from '../components/chapter/chapterContainer.svelte';
	import { paneService } from '../../../../lib/services/pane.service.svelte';
	import { componentMapping } from '$lib/services/component-mapping.service';
	import { colorTheme } from '$lib/services/colorTheme.service';

	//paneService.splitPane(paneService.rootPane, PaneSplit.Horizontal, 'ChapterContainer')

	let obj: any = $state({});
	let chapterSettings: ChapterSettings | null = $state(null);

	onMount(() => {
		/** chapter setting is duplicated at the moment. will update
		 * when we refactor out chaptersettings. Chatpersettings will
		 * become it's own buffer.
		 */
		let cs = localStorage.getItem('chapterSettings');
		if (cs !== null) {
			chapterSettings = JSON.parse(cs);

			if (chapterSettings && chapterSettings.colorTheme) {
				colorTheme.setTheme(chapterSettings?.colorTheme);
			}
		} else {
			chapterSettings = newChapterSettings();
		}

		if (paneService.rootPane.buffer.componentName === 'NullBuffer') {
			paneService.rootPane.buffer.componentName = 'ChapterContainer';
			componentMapping.map(paneService.rootPane);
		}
		
		obj.obj = [paneService.rootPane];
		componentMapping.map(obj.obj[0]);
		paneService.onUpdate = (p: Pane) => {
			console.log('update', JSON.stringify(p.leftPane?.buffer.bag));
			componentMapping.map(p);

			obj.obj = [p];
		};
	});
</script>

{#if obj.obj}
	{#each obj.obj as p, idx}
		<div class="flex h-full w-full flex-col">
			<RecursivePane bind:pane={obj.obj[idx]}></RecursivePane>
		</div>
	{/each}
{/if}
