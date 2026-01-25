<script>
	import KJVButtonRounded from '$lib/components/buttons/KJVButtonRounded.svelte';
	import { authService } from '$lib/nostr/services/auth.service';

	let nsec = $state('');
	function nsecLogin() {
		console.debug('[nsec]', nsec);
		authService.withNsec(nsec);
	}
</script>

<div class="flex h-full flex-col items-center justify-center">
	<p class="p-2">Input your nsec key</p>
	<div class="flex max-w-72 flex-col space-y-2">
		<input
			bind:value={nsec}
			type="text"
			id="nsecText"
			class=" border-primary-500 w-full border-b-1 outline-none"
		/>
		<KJVButtonRounded onClick={nsecLogin}>NSEC Login</KJVButtonRounded>
	</div>
</div>
