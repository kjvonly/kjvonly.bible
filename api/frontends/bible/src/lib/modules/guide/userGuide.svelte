<script lang="ts">
	import { paneService } from '$lib/services/pane.service.svelte';

	let {
		paneId,
		pane = $bindable(),
		containerHeight = $bindable(),
		containerWidth = $bindable()
	} = $props();

	let clientHeight = $state(0);
	let headerHeight = $state(0);
</script>

<div bind:clientHeight style={containerHeight} class="overflow-hidden">
	<div class="flex flex-col items-center justify-center">
		<div bind:clientHeight={headerHeight} class="flex w-full flex-col items-center">
			<div class="flex w-full max-w-lg justify-end bg-neutral-100">
				<button
					aria-label="close"
					onclick={() => {
						paneService.onDeletePane(paneService.rootPane, paneId);
					}}
					class="h-12 w-12 px-2 pt-2 text-neutral-700"
				>
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
						<path
							class="fill-neutral-700"
							d="M12,2C6.47,2,2,6.47,2,12s4.47,10,10,10s10-4.47,10-10S17.53,2,12,2z M17,15.59L15.59,17L12,13.41L8.41,17L7,15.59 L10.59,12L7,8.41L8.41,7L12,10.59L15.59,7L17,8.41L13.41,12L17,15.59z"
						/>
					</svg>
				</button>
			</div>
		</div>
		<div class="flex w-full max-w-lg items-center p-4">
			<div
				style="height: {clientHeight - headerHeight}px"
				class="
              -m-1 w-full overflow-x-hidden overflow-y-scroll bg-neutral-50
              "
			>
				<div class="max-w-lg">
					<p class="-neutral-500 py-10">Book Chapter Navigation:</p>

					<iframe
						class="min-h-[200px]"
						width="100%"
						height="100%"
						src="https://www.youtube.com/embed/uf3RvgCuISw?si=39HBNkZo770VXsuQ?rel=0"
						title="Book Chapter Navigation"
						frameborder="0"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
						referrerpolicy="strict-origin-when-cross-origin"
						allowfullscreen
					></iframe>

					<p class="py-10">
						Navigate the Bible by clicking the book chapter in the bible actions. This will launch a
						grid showing the books of the Bible color coded by category. Clicking the list icon will
						show chapters in chronological order. Filter books by typing the book name.
					</p>
				</div>

				<div class="max-w-lg">
					<p class="-neutral-500 py-10">Strongs Concordance:</p>

					<iframe
						class="min-h-[200px]"
						width="100%"
						height="100%"
						src="https://www.youtube.com/embed/JReTiNWSooY?si=W5dba4WB5wYvmvmU?rel=0"
						title="Strongs Concordance"
						frameborder="0"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
						referrerpolicy="strict-origin-when-cross-origin"
						allowfullscreen
					></iframe>

					<p class="py-10">
						Words with a dotted underline contain references. The word could have a Strongs or verse
						reference. A word will have a By Book section listing all the books this word is in and
						a By Word listing the synonyms and sometimes antonyms. Clicking on a By Book or By Word
						reference will open a search view with those references.
					</p>
				</div>

				<div class="max-w-lg">
					<p class="-neutral-500 py-10">Strongs and Verse References:</p>
					<iframe
						class="min-h-[200px]"
						width="100%"
						height="100%"
						src="https://www.youtube.com/embed/9JG0WmDSuzA?si=8LXamitGXw1zwk4D"
						title="Strongs and Verse References:"
						frameborder="0"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
						referrerpolicy="strict-origin-when-cross-origin"
						allowfullscreen
					></iframe>
					<p class="py-10">
						Verses with a dotted underline signals the verse has verse references. Clicking the
						verse number will display all footnote, Strongs, and verse references for the verse. A
						user can recursively search the verse references by clicking a verse reference. If the
						verse reference clicked has verse references than those verse references will be
						displayed. A breadcrumb trail will be displayed at the top of the references to identify
						the verses the user has clicked thus far.
					</p>
				</div>

				<div class="max-w-lg">
					<p class="-neutral-500 py-10">Split Screen:</p>
					<iframe
						class="min-h-[200px]"
						width="100%"
						height="100%"
						src="https://www.youtube.com/embed/dCeTizAgK6I?si=Uw5jtVmgTHMqFf3T"
						title="Split Screen"
						frameborder="0"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
						referrerpolicy="strict-origin-when-cross-origin"
						allowfullscreen
					></iframe>

					<p class="py-10">
						Throughout the app, a user can split screen vertically or horizontally either by
						clicking the option in the menu list or clicking on the icons.
					</p>
				</div>

				<div class="max-w-lg">
					<p class="-neutral-500 py-10">Search:</p>
					<iframe
						class="min-h-[200px]"
						width="100%"
						height="100%"
						src="https://www.youtube.com/embed/6sDZOjnfRMk?si=gOxKf8yMnvMZ3rCf"
						title="Search"
						frameborder="0"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
						referrerpolicy="strict-origin-when-cross-origin"
						allowfullscreen
					></iframe>

					<p class="py-10">
						Search for terms in the bible. The search features is by exact match. Try different
						suffixes if the verse you are looking for is not returned. For example,
						<span class="text-primary-500">love world</span>
						would not return John 3:16 but <span class="text-primary-500">loved world</span> would.
					</p>
				</div>

				<div class="max-w-lg">
					<p class="-neutral-500 py-10">Search By Book:</p>
					<iframe
						class="min-h-[200px]"
						width="100%"
						height="100%"
						src="https://www.youtube.com/embed/Qf4_IAzr2UI?si=_NvkzetEk2SFCeBJ"
						title="Search By Book"
						frameborder="0"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
						referrerpolicy="strict-origin-when-cross-origin"
						allowfullscreen
					></iframe>

					<p class="py-10">
						Search by book by adding the short name of the book. For example, add
						<span class="text-primary-500">mat</span>
						to filter results to the book of Matthew, <span class="text-primary-500">joh</span> to
						filter results to the book of John. To find a specific verse, you can also search for
						the short name of the book followed by the chapter and verse. For example,
						<span class="text-primary-500">Joh 3 16</span> will return John 3:16.
					</p>
				</div>

				<div class="max-w-lg">
					<p class="-neutral-500 py-10">Annotations:</p>
					<iframe
						class="min-h-[200px]"
						width="100%"
						height="100%"
						src="https://www.youtube.com/embed/K2GRUDh4yoc?si=UTqH4Ln41gztF4g8"
						title="Annotations"
						frameborder="0"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
						referrerpolicy="strict-origin-when-cross-origin"
						allowfullscreen
					></iframe>

					<p class="py-10">
						Add annotations to a any word or verse number by clicking/pressing a word or verse
						number for 1 second. This will activate annotation mode. In annotation mode, you can
						click on any word or verse number to add text annotations. Select the highlighter to
						highlight text, the T to change text color, or the U to underline text. Click the save
						icon to save the annotations or the close button to discard changes.
					</p>
					<p class="">
						* Be sure to periodically export your annotations. You can
						<span class="text-primary-500">Export Data</span> from the Bible drop down. If you ever
						need to add annotations back to the app you can use the
						<span class="text-primary-500">Import Data</span> option from the Bible drop down list.
					</p>
				</div>

				<div class="max-w-lg">
					<p class="-neutral-500 py-10">Notes:</p>
					<iframe
						class="min-h-[200px]"
						width="100%"
						height="100%"
						src="https://www.youtube.com/embed/OKwHVB5tntI?si=8TSI7X3z4KHyoGAC"
						title="Notes"
						frameborder="0"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
						referrerpolicy="strict-origin-when-cross-origin"
						allowfullscreen
					></iframe>

					<p class="py-10">
						Add a note to any word or verse number by clicking/pressing a word or verse number for 1
						second. This will activate annotation mode. In annotation mode, you can click the note
						icon below the color options. This will display the notes for this word. Click the add
						button to add a new note associated to this word. A user can add as many notes to a word
						as they like.
					</p>

					<p class="">
						Navigate to the Notes module to view all exiting notes. You can also filter notes based
						on text, title, or tag.
					</p>

					<p class="py-10">
						* Be sure to periodically export your data. You can
						<span class="text-primary-500">Export Data</span> from the Bible drop down. If you ever
						need to add annotations back to the app you can use the
						<span class="text-primary-500">Import Data</span> option from the Bible drop down list.
					</p>
				</div>

				<div class="h-6"></div>
			</div>
		</div>
	</div>
</div>
