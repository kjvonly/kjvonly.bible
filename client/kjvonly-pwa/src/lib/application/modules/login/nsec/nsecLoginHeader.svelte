<script lang="ts">
	import {
		useNavigationRuntimeContext
	} from '$lib/application/runtime/navigation/navigation-runtime-context';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import ArrowBack from '$lib/components/svgs/arrowBack.svelte';

	const {
		navigation
	} = useNavigationRuntimeContext();

	function onBack(e: Event): void {
		e.stopPropagation();
		navigation.back();
	}
</script>

{#snippet header()}
	<div
		class="grid w-full grid-cols-3 bg-neutral-100 py-2 leading-tight"
	>
		<KJVButton onClick={onBack} classes="ps-4">
			<ArrowBack></ArrowBack>
		</KJVButton>

		<span class="text-center">NSEC Login</span>
	</div>
{/snippet}

{@render header()}
