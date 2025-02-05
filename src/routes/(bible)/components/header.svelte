<script lang="ts">
	import Button from '../../../components/button.svelte';
	
	import SettingsPopup from './settingsPopup.svelte';
	import { searchService } from '$lib/services/search.service';
	import { onMount } from 'svelte';
	import { bibleNavigationService } from '$lib/services/bible-navigation.service';
	import Search from './search.svelte';
	import BookChapterPopup from './bookChapterPopup.svelte';

	let clientHeight: number = $state(0);

	let pageWidth: number = $state(0);
	let bookChapterWidth: number = $state(0);
	let searchText = $state('');
	let searchResults: any[] = $state([]);

	let {
		chapterKey = $bindable(),
		bookName = $bindable(),
		bookChapter = $bindable(),
		chapterSettings = $bindable(),
		goTo
	} = $props();

	let showBookChapterPopup: Boolean = $state(false);
	let showSettingsPopup: Boolean = $state(false);

	function clearSearch() {
		searchText = '';
		searchResults = [];
	}

	function onBookChapterClick() {
		clearSearch();
		showSettingsPopup = false;
		showBookChapterPopup = !showBookChapterPopup;
	}

	function onSettingsClick() {
		clearSearch();
		showBookChapterPopup = false;
		showSettingsPopup = !showSettingsPopup;
	}

	// scroll header off the top of page
	let lastKnownScrollPosition = 0;
	let ticking = false;
	let headerTopOffset = $state(0);

	function setHeaderTopOffset(sp: number) {
		headerTopOffset = sp / 3;
	}

	document.addEventListener('scroll', (event) => {
		lastKnownScrollPosition = window.scrollY;
		if (!ticking) {
			window.requestAnimationFrame(() => {
				setHeaderTopOffset(lastKnownScrollPosition);
				ticking = false;
			});
			ticking = true;
		}
	});
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->

<div class="flex w-[100%] flex-col justify-center">
	<div class="flex flex-row justify-center">
		<div
			bind:clientWidth={bookChapterWidth}
			class="flex-col"
					>
			<!-- book chapter selection -->

			<BookChapterPopup bind:showBookChapterPopup bind:chapterKey
			></BookChapterPopup>
		</div>
		<!-- settings buttong Aa -->

		<Button fn={onSettingsClick} text={'Settings'} base={true}></Button>
		<!-- <SettingsPopup bind:chapterSettings></SettingsPopup> -->
	</div>

	<Search goTo></Search>
</div>

<style></style>
