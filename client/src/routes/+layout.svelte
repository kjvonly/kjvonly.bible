<script lang="ts">
	// CSS
	import '../app.css';
	import '../../node_modules/quill/dist/quill.snow.css';

	// SVELTE
	import { onMount } from 'svelte';

	// COMPONENTS
	import Container from '$lib/components/container.svelte';

	// SERVICES
	import { syncService } from '$lib/domains/bible/services/sync.service';

	// TODO reorg imports
	import { browser } from '$app/environment';
	import { rxNostr } from '$lib/nostr/timelines/MainTimeline';
	import { defaultRelays } from '$lib/nostr/Constants';
	import { WebStorage } from '$lib/nostr/WebStorage';
	import { Login } from '$lib/nostr/Login';
	import { getBibleDB } from '$lib/domains/bible/persistence/bible.db';


	// APPLICATION START
	import {
		Application
	} from '$lib/application/runtime/application';

	import {
		provideApplicationContext
	} from '$lib/application/runtime/application-context';

	import {
		createApplicationConfig
	} from '$lib/application/config/application.config';

	const application =
	new Application(
		createApplicationConfig()
	);

provideApplicationContext(
	application.context
);

let applicationReady =
	$state(false);

let applicationStartupError =
	$state<unknown>();


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

	let ready =
	$state(false);

let startupError:
	unknown =
		$state();

onMount(() => {
	let disposed =
		false;

	const start =
		async () => {
			try {
				await application.start();

				if (!disposed) {
					ready =
						true;
				}
			} catch (error) {
				if (!disposed) {
					startupError =
						error;
				}
			}
		};

	void start();

	return () => {
		disposed =
			true;

		void application.stop();
	};
});

	// onMount(() => {
	// let syncTimer:
	// 	ReturnType<typeof setTimeout> |
	// 	undefined;

	// async function start():
	// 	Promise<void> {

	// 	try {
	// 		/*
	// 		 * New application Composition Root.
	// 		 *
	// 		 * Currently this initializes the new
	// 		 * ResourceClient infrastructure.
	// 		 */
	// 		await application.start();

	// 		/*
	// 		 * Legacy startup.
	// 		 *
	// 		 * These responsibilities will move into
	// 		 * Application.start() incrementally.
	// 		 */
	// 		await getBibleDB();

	// 		console.debug(
	// 			'[layout load]'
	// 		);

	// 		let authenticated =
	// 			false;

	// 		if (browser) {
	// 			rxNostr.setDefaultRelays(
	// 				defaultRelays
	// 			);

	// 			authenticated =
	// 				await tryLogin();
	// 		}

	// 		if (!authenticated) {
	// 			console.debug(
	// 				'[layout load] not logged in'
	// 			);
	// 		}

	// 		/*
	// 		 * Existing deferred background sync.
	// 		 *
	// 		 * This remains legacy behavior for now.
	// 		 */
	// 		syncTimer =
	// 			setTimeout(
	// 				() => {
	// 					//syncService.init();
	// 				},
	// 				5000
	// 			);

	// 		applicationReady =
	// 			true;
	// 	} catch (cause) {
	// 		console.error(
	// 			'[application startup]',
	// 			cause
	// 		);

	// 		applicationStartupError =
	// 			cause;
	// 	}
	// }

// 	void start();

// 	return () => {
// 		if (
// 			syncTimer !==
// 			undefined
// 		) {
// 			clearTimeout(
// 				syncTimer
// 			);
// 		}

// 		void application.stop();
// 	};
// });


	let { children } = $props();
</script>

<Container>
	{#if ready}
		{@render children?.()}
	{:else if startupError}
		<div>
			Application startup failed.
		</div>
	{:else}
	<div>
		Loading...
	</div>
	{/if}
</Container>

{#if applicationStartupError}
	<div>
		Application startup failed.
	</div>
{:else if applicationReady}
	<Container>
		{@render children?.()}
	</Container>
{:else}
	<div>
		Loading...
	</div>
{/if}