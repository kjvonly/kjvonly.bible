import {
	Buffer
} from 'node:buffer';

import {
	createReadStream
} from 'node:fs';

import {
	Readable
} from 'node:stream';

import type {
	Clock
} from '../../ports/clock.js';

import type {
	EventSigner
} from '../../ports/event-signer.js';

import type {
	BlossomPublicationClient,
	BlossomPublicationRequest
} from '../../ports/blossom-publication-client.js';
import { Logger } from '../../ports/logger.js';


const BLOSSOM_AUTH_KIND =
	24242;


const AUTH_LIFETIME_SECONDS =
	300;


export class NodeBlossomPublicationClient
	implements BlossomPublicationClient {

	constructor(
		private readonly signer:
			EventSigner,

		private readonly clock:
			Clock,


		private readonly logger:
			Logger,


		private readonly fetcher:
			typeof fetch =
			globalThis.fetch.bind(
				globalThis
			)
	) { }


	async ensure(
		request:
			BlossomPublicationRequest
	) {

		const exists =
			await this.artifactExists(
				request.serverUrl,
				request.sha256
			);


		if (
			exists
		) {

			this.logArtifactPresent(
				request
			);

			return 'already-present' as const;
		}

		this.logArtifactUploadStart(
			request
		);

		await this.upload(
			request
		);


		this.logArtifactUploadComplete(
			request
		);

		return 'uploaded' as const;
	}


	private async artifactExists(
		serverUrl:
			string,

		sha256:
			string
	): Promise<boolean> {

		const url =
			this.buildArtifactUrl(
				serverUrl,
				sha256
			);


		let response:
			Response;


		try {
			response =
				await this.fetcher(
					url,
					{
						method:
							'HEAD'
					}
				);
		}
		catch (
		error:
			unknown
		) {
			throw new Error(
				`Blossom existence check failed for "${url}".`,
				{
					cause:
						error
				}
			);
		}


		if (
			response.status ===
			200
		) {
			return true;
		}


		if (
			response.status ===
			404
		) {
			return false;
		}


		throw new Error(
			`Blossom existence check failed for "${url}": HTTP ${response.status}.`
		);
	}


	private async upload(
		request:
			BlossomPublicationRequest
	): Promise<void> {

		const url =
			this.buildUploadUrl(
				request.serverUrl
			);


		const authorization =
			await this
				.createAuthorization(
					request.serverUrl,
					request.sha256
				);


		const nodeStream =
			createReadStream(
				request.artifactPath
			);


		const body =
			Readable.toWeb(
				nodeStream
			);


		let response:
			Response;


		try {
			response =
				await this.fetcher(
					url,
					{
						method:
							'PUT',

						headers: {
							Authorization:
								authorization,

							'Content-Type':
								request.mediaType,

							'Content-Length':
								String(
									request.size
								),

							'X-SHA-256':
								request.sha256
						},

						body:
							body as BodyInit,

						duplex:
							'half'
					} as RequestInit & {
						readonly duplex:
						'half';
					}
				);
		}
		catch (
		error:
			unknown
		) {
			nodeStream.destroy();


			throw new Error(
				`Blossom upload failed for "${request.serverUrl}".`,
				{
					cause:
						error
				}
			);
		}


		if (
			response.status !==
			200 &&
			response.status !==
			201
		) {
			throw new Error(
				`Blossom upload failed for "${request.serverUrl}": HTTP ${response.status}.`
			);
		}


		await this.validateUploadResponse(
			response,
			request
		);
	}


	private async createAuthorization(
		serverUrl:
			string,

		sha256:
			string
	): Promise<string> {

		const createdAt =
			this.clock
				.nowEpochSeconds();


		const server =
			new URL(
				serverUrl
			)
				.hostname;


		const event =
			await this.signer
				.sign({
					kind:
						BLOSSOM_AUTH_KIND,

					created_at:
						createdAt,

					content:
						'Authorize upload',

					tags: [
						[
							't',
							'upload'
						],
						[
							'x',
							sha256
						],
						[
							'expiration',
							String(
								createdAt +
								AUTH_LIFETIME_SECONDS
							)
						],
						[
							'server',
							server
						]
					]
				});


		const encodedEvent =
			Buffer
				.from(
					JSON.stringify(
						event
					),
					'utf8'
				)
				.toString(
					'base64'
				);


		return (
			`Nostr ${encodedEvent}`
		);
	}


	private async validateUploadResponse(
		response:
			Response,

		request:
			BlossomPublicationRequest
	): Promise<void> {

		let value:
			unknown;


		try {
			value =
				await response.json();
		}
		catch (
		error:
			unknown
		) {
			throw new Error(
				`Invalid Blossom upload response from "${request.serverUrl}".`,
				{
					cause:
						error
				}
			);
		}


		if (
			typeof value !==
			'object' ||
			value ===
			null ||
			Array.isArray(
				value
			)
		) {
			throw new Error(
				`Invalid Blossom upload response from "${request.serverUrl}".`
			);
		}


		const descriptor =
			value as Record<
				string,
				unknown
			>;


		if (
			descriptor.sha256 !==
			request.sha256
		) {
			throw new Error(
				`Blossom upload SHA-256 mismatch from "${request.serverUrl}".`
			);
		}
	}


	private buildArtifactUrl(
		serverUrl:
			string,

		sha256:
			string
	): string {

		return (
			serverUrl.replace(
				/\/+$/,
				''
			) +
			'/' +
			sha256
		);
	}


	private buildUploadUrl(
		serverUrl:
			string
	): string {

		return (
			serverUrl.replace(
				/\/+$/,
				''
			) +
			'/upload'
		);
	}

	///////////////////////////////////////////////////////////////////////////
	// Log Helpers

	private logArtifactPresent(
		request:
			BlossomPublicationRequest
	): void {

		this.logger.verbose(
			'blossom.artifact.present',
			{
				serverUrl:
					request.serverUrl,

				sha256:
					request.sha256
			}
		);
	}

	private logArtifactUploadStart(
		request:
			BlossomPublicationRequest
	): void {

		this.logger.verbose(
			'blossom.artifact.upload.start',
			{
				serverUrl:
					request.serverUrl,

				sha256:
					request.sha256,

				size:
					request.size
			}
		);
	}


	private logArtifactUploadComplete(
		request:
			BlossomPublicationRequest
	): void {

		this.logger.verbose(
			'blossom.artifact.upload.complete',
			{
				serverUrl:
					request.serverUrl,

				sha256:
					request.sha256,

				size:
					request.size
			}
		);
	}
}