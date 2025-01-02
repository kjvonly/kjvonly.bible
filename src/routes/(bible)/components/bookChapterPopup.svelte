<script lang="ts">
	import { chapterService } from "$lib/api/chapters.service";
	import { onMount } from "svelte";
	

    onMount(async () => {
        let bookNames = await chapterService.getChapter('booknames')
        console.log(bookNames)
    })
    
    
</script>

<div class="w-full h-full overflow-y-scroll">

</div>