<script lang="ts">
	import {
		useNavigationRuntimeContext
	} from '$lib/application/runtime/navigation/navigation-runtime-context';

	import Close from '$lib/components/svgs/close.svelte';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';

	const {
		navigation
	} = useNavigationRuntimeContext();

	function onClose(e: Event): void {
		e.stopPropagation();

		navigation.back();
	}
</script>

{#snippet header()}
	<div
		class="flex w-full flex-row bg-neutral-100 py-2 leading-tight"
	>
		<span class="flex-1"></span>
		<span class="text-center">Login</span>
		<div class="flex flex-1 justify-end pe-4">
			<KJVButton onClick={onClose} classes="">
				<Close classes=""></Close>
			</KJVButton>
		</div>
	</div>
{/snippet}

{@render header()}
