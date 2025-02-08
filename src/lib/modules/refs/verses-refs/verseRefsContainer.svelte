<script lang="ts">
	import { bibleDB } from '$lib/db/bible.db';
	import { onMount } from 'svelte';

	let { chapterKey, verse, verseRefs = $bindable() } = $props();

	let bookName = $state();
	let bookChapter = $state();
	let verseNumber = $state();
	let verseText = $state();
	let verseRefs2: any[] = $state([]);

	onMount(async () => {
		let data = await bibleDB.getValue('chapters', chapterKey);
		bookName = data['bookName'];
		bookChapter = data['number'];
		verseNumber = verse['number'];
		verseText = verse['text'].substring(1, verse['text'].length);

        let vrefs = []

        let vref = {
                ref: chapterKey.replaceAll('_', '/') + verseNumber,
                bookName: bookName,
                chapter: bookChapter,
                verse: verseText
            }

            vrefs.push(vref)

		verseRefs.forEach(async (ref: string) => {
			let index = ref.lastIndexOf('/');
			let ckey = ref.substring(0, index);
            let cnumber = ckey.split('/')[1]
			let vnumber = ref.substring(index + 1, ref.length);
            let data = await bibleDB.getValue('chapters', ckey);
            let bname = data['bookName']
            let v = data['verseMap'][vnumber]
            let vNoVn = v.substring(1, v.length-1) 

            let vref = {
                ref: ref,
                bookName: bname,
                chapter: cnumber,
                verse: vNoVn
            }
            vrefs.push(vref)
		});

        verseRefs2.push(vrefs)

	});
</script>

<div>
    
	<h1>Verse Refrences: </h1>
</div>
