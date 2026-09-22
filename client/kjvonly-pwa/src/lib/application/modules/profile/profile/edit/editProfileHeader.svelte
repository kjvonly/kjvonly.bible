<script lang="ts">
	import type { NavigationService } from '$lib/application/services/navigation.service';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import ArrowBack from '$lib/components/svgs/arrowBack.svelte';
	import Save from '$lib/components/svgs/save.svelte';

	let {
		navService = $bindable(),
		saving = false,
		onSave
	}: {
		navService: NavigationService;
		saving?: boolean;
		onSave: () => Promise<void>;
	} = $props();

	function onBack(e: Event): void {
		e.stopPropagation();
		navService.pop();
	}
</script>

{#snippet header()}
	<div class="grid w-full grid-cols-3 place-items-center">
		<div class="justify-self-start ps-4">
			<KJVButton onClick={onBack} classes="">
				<ArrowBack classes=""></ArrowBack>
				<span class="sr-only">Back to profile</span>
			</KJVButton>
		</div>

		<span class="text-center">Edit Profile</span>

		<div class="justify-self-end pe-4">
			<KJVButton onClick={onSave} classes="" disabled={saving}>
				<Save classes=""></Save>
				<span class="sr-only">Save profile</span>
			</KJVButton>
		</div>
	</div>
{/snippet}

{@render header()}
