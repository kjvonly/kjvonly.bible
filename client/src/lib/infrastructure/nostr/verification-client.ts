import {
	createVerificationServiceClient,
	type VerificationServiceClient
} from '@rx-nostr/crypto';

const VERIFICATION_REQUEST_TIMEOUT_MS =
	10_000;

export function createBrowserVerificationClient():
	VerificationServiceClient {
	const worker = new Worker(
		new URL(
			'./verification.worker.ts',
			import.meta.url
		),
		{
			type: 'module'
		}
	);

	return createVerificationServiceClient({
		worker,
		timeout:
			VERIFICATION_REQUEST_TIMEOUT_MS
	});
}