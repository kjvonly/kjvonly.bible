<script lang="ts">
	import { bibleDB } from '$lib/db/bible.db';
	import { onMount } from 'svelte';

	let { chapterKey, verse, verseRefs = $bindable() } = $props();

	let bookName = $state();
	let bookChapter = $state();
	let verseNumber = $state();
	let verseText = $state();
	let verseRefs2: any = $state([]);

	onMount(async () => {
		console.log('chapterKey ', chapterKey);
		let data = await bibleDB.getValue('chapters', chapterKey);
		bookName = data['bookName'];
		bookChapter = data['number'];
		verseNumber = verse['number'];
		verseText = verse['text'].substring(1, verse['text'].length);

		let vrefs = $state([]);

		let vref = {
			ref: chapterKey.replaceAll('_', '/') + verseNumber,
			bookName: bookName,
			chapter: bookChapter,
			vnumber: verseNumber,
			text: verseText
		};

		vrefs.push(vref);

		verseRefs.forEach(async (ref: string) => {
			let index = ref.lastIndexOf('/');
			let ckey = ref.substring(0, index).replaceAll('/', '_');
			let cnumber = ckey.split('_')[1];
			let vnumber = ref.substring(index + 1, ref.length);
			let data = await bibleDB.getValue('chapters', ckey);
			let bname = data['bookName'];
			let v = data['verseMap'][vnumber];
			let vNoVn = v.substring(0, v.length - 1);

			let vref = {
				ref: ref,
				bookName: bname,
				chapter: cnumber,
				vnumber: vnumber,
				text: vNoVn
			};
			vrefs.push(vref);
			console.log(vref);
		});

		verseRefs2.push(vrefs);
	});
</script>

{#snippet vrefSnippet(vref: any)}
	<p>{vref.bookName} {vref.chapter}:{vref.vnumber}</p>
	<p>
		{#each vref.text.split(' ') as w}
			<span class="inline-block">{w}</span>&nbsp;
		{/each}
	</p>
{/snippet}

<div>
	<div class="py-4">
		<h1 class="font-bold underline underline-offset-8">Verse References:</h1>
		<div class="py-4">
			{#if verseRefs2.length > 0}
				{@const vref = verseRefs2[verseRefs2.length - 1][0]}

				{@render vrefSnippet(vref)}

				{#each verseRefs2[verseRefs2.length - 1].slice(1, verseRefs2[verseRefs2.length - 1].length) as vref, idx}
					{@render vrefSnippet(vref)}
				{/each}
			{/if}
		</div>
	</div>
</div>
