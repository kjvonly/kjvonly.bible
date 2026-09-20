export {
	RESOURCE_KIND,
	type DecodedResourceContent,
	type PublishedResourceReference,
	type ResourceRepresentation,
	type ResourceRepresentationType,
	type SerializedResourceContent,
	type VerifiedResourceContent
} from './models/resource.model';

export type {
	InstallationTransaction
} from './installation/installation-transaction';

export type {
	ResourceHandler
} from './installation/resource-handler';

export type {
	ResourceInstallationStore
} from './installation/resource-installation-store';

export {
	createResourceInstallationId,
	type ResourceInstallation
} from './installation/resource-installation';

export {
	extractResourcePath,
	extractResourceType,
	parseResourceIdentifier,
	type ResourceIdentifier
} from './utils/resource-identifier';

export type {
	ResourceInterpreter
} from './interpretation/resource-interpreter';

export type {
	ResourceValidator
} from './validation/resource-validator';

export {
	isResourceDeletionPublication,
	type ResourceDeletionPublication,
	type ResourcePublication,
	type ResourcePublicationIntent
} from './publication/resource-publication';

export {
	ResourcePublicationResolver,
	type ResourcePublicationRegistration
} from './publication/resource-publication-resolver';

export type {
	ResourceInstallOutcome,
	ResourceInstallResult
} from './services/resource-install-result';

export {
	ResourceLoader
} from './loading/resource-loader';

export {
	appendResourceReferenceBuilder,
	type ResourceReferenceBuilder
} from './loading/resource-reference-builder';

export {
	createResourceReceiptId,
	type ResourceReceipt
} from './receipts/resource-receipt';

export type {
	ResourceResolutionCurrent,
	ResourceResolutionFailure,
	ResourceResolutionResult
} from './resolution/resource-resolution-result';

export type {
	ResourceContentDecorator
} from './content/resource-content-decorator';

export {
	ResourceContentDecoratorBuilder,
	type ResourceContentDecoratorRegistration
} from './content/resource-content-decorator-builder';

export {
	JsonResourceContentDecorator
} from './content/json-resource-content-decorator';

export {
	ResourceContentDecoder
} from './content/resource-content-decoder';

export type {
	ResourceReceiptStore
} from './receipts/resource-receipt-store';

export {
	ResourceReceiptService
} from './receipts/resource-receipt.service';

export {
	ResourceService
} from './services/resource.service';

export {
	ResourceProcessor
} from './services/resource-processor';

export {
	ResourceContentEncoder
} from './content/resource-content-encoder';

export {
	GzipResourceContentDecorator
} from './content/gzip-resource-content-decorator';

export {
	HexResourceContentDecorator
} from './content/hex-resource-content-decorator';

export type {
	ResourceDescriptor,
	ResourceDescriptorMetadata,
	ResourceDescriptorStrategy
} from './descriptors/resource-descriptor';

export {
	ResourceDescriptorDocumentDecoder
} from './descriptors/resource-descriptor-document-decoder';

export {
	ResourceDescriptorValidator
} from './descriptors/resource-descriptor-validator';

export type {
	ResourceRepresentationResolver
} from './resolution/resource-representation-resolver';

export type {
	ResourceResolutionStrategy
} from './resolution/resource-resolution-strategy';

export {
	DescriptorsRepresentationResolver
} from './resolution/descriptors-representation-resolver';

export {
	ContentRepresentationResolver
} from './resolution/content-representation-resolver';

export {
	ResourceResolver
} from './resolution/resource-resolver';

export {
	createBrowserResourceWorkerClient,
	ResourceWorkerClient,
	type ResourceWorkerPort
} from './worker/resource-worker-client';
