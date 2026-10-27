<script lang="ts">
	import KJVScrubbedViewport from '$lib/components/navigation/KJVScrubbedViewport.svelte';
	import PlanDetailsScrollLayout from '$lib/domains/reading-plans/modules/plans/components/planDetailsScrollLayout.svelte';

	let readingNumber = $state(1);
</script>

<!-- An intentionally short pane with large content, like a zoomed Bible workspace. -->
<div style="height: 260px; width: 320px;">
	<PlanDetailsScrollLayout title="A Long Reading Plan Title">
		<KJVScrubbedViewport
			min={1}
			max={3}
			bind:value={readingNumber}
			label="Test reading"
			showScrubber={false}
		>
			<section data-plan-description>
				<p style="font-size: 26px; line-height: 1.5;">
					A description that takes several lines when the user selects
					larger text. The user should be able to scroll past every line
					to reach the readings while the plan title stays in place.
				</p>
			</section>
			<div>Readings</div>
			<div data-kjv-scrubber-value="1" style="min-height: 100px;">First reading</div>
			<div data-kjv-scrubber-value="2" style="min-height: 100px;">Second reading</div>
			<div data-kjv-scrubber-value="3" style="min-height: 100px;">Third reading</div>
		</KJVScrubbedViewport>
	</PlanDetailsScrollLayout>
</div>
