<script lang="ts">
	// CSS
	import '../app.css';
	import '../../node_modules/quill/dist/quill.snow.css';

	// SVELTE
	import { onMount } from 'svelte';

	// COMPONENTS
	import Container from '$lib/components/container.svelte';

	// SERVICES
	import { syncService } from '$lib/services/sync.service';

	// TODO reorg imports
	import { browser } from '$app/environment';
	import { rxNostr } from '$lib/nostr/timelines/MainTimeline';
	import { defaultRelays } from '$lib/nostr/Constants';
	import { WebStorage } from '$lib/nostr/WebStorage';
	import { Login } from '$lib/nostr/Login';

	function register() {
		// Listen for connection coming online
		window.addEventListener('online', () => {
			syncService.sync();
			console.log('Network connection restored.');
		});

		// Listen for connection going offline
		window.addEventListener('offline', () => {
			console.log('Network connection lost.');
			// Show offline message or queue requests
		});

		document.addEventListener('visibilitychange', () => {
			if (!document.hidden) {
				syncService.sync();
				console.log('Page is now visible (returned to foreground)');
			}
		});
	}

	async function tryLogin(): Promise<boolean> {
		const storage = new WebStorage(localStorage);
		const savedLogin = storage.get('login');
		console.debug('[layout login]', savedLogin);

		if (savedLogin === null) {
			return false;
		}

		const login = new Login();
		if (savedLogin === 'NIP-07') {
			const { waitNostr } = await import('nip07-awaiter');
			const nostr = await waitNostr(10000);
			console.debug('[NIP-07]', nostr);
			if (nostr === undefined) {
				console.error('Browser Extension was not found');
				return false;
			}
			await login.withNip07();
		} else if (savedLogin.startsWith('bunker://')) {
			const success = await login.withNip46(savedLogin);
			if (!success) {
				return false;
			}
		} else if (savedLogin.startsWith('nsec')) {
			await login.withNsec(savedLogin);
		} else if (savedLogin.startsWith('npub')) {
			await login.withNpub(savedLogin);
		} else {
			console.error('[login logic error]');
			return false;
		}

		return true;
	}

	onMount(async () => {
		// loginService.init();
		// await relayService.init();
		console.debug('[layout load]');
		let authenticated = false;
		if (browser) {
			rxNostr.setDefaultRelays(defaultRelays);
			authenticated = await tryLogin();
		}

		setTimeout(() => {
			syncService.init();
		}, 5000);

		//register();
	});

	let { children } = $props();
</script>

<Container>
	{@render children?.()}
</Container>
