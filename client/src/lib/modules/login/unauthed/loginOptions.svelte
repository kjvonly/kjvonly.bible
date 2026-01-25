<script>
	import KJVButtonRounded from '$lib/components/buttons/KJVButtonRounded.svelte';

	function createAccount() {}
	function nsecLogin() {}
</script>

<div class="flex h-full flex-col items-center justify-center">
	<p class="p-2">All you need is a name.</p>
	<div class="flex max-w-72 flex-col space-y-2">
		<KJVButtonRounded onClick={createAccount}>Create Account</KJVButtonRounded>

		<KJVButtonRounded onClick={nsecLogin}>NSEC Login</KJVButtonRounded>
	</div>
	<div>
		<span class="flex underline"></span>
		<span class="flex underline"></span>
	</div>
</div>
