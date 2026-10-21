<script lang="ts">
	import {
		provideApplicationContext,
		provideNavigationRuntimeContext,
		providePaneLayoutContext,
		type ApplicationContext,
		type PaneNavigation
	} from '$lib/application';
	import type { SettingsService } from '$lib/application/services/settings.service';
	import BibleOverflowActionsView from '$lib/domains/bible/modules/reader/views/bibleOverflowActionsView.svelte';

	let {
		settingsService,
		navigation
	}: {
		settingsService: SettingsService;
		navigation: PaneNavigation;
	} = $props();

	provideApplicationContext({ settingsService } as ApplicationContext);
	provideNavigationRuntimeContext({ navigation });
	providePaneLayoutContext({ clientHeight: 800, clientWidth: 800 });
</script>

<BibleOverflowActionsView></BibleOverflowActionsView>
