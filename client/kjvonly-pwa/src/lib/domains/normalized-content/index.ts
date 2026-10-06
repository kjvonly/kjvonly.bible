export type {
	NormalizedBlock
} from './models/normalized-block.model';

export type {
	NormalizedContent,
	NormalizedLineBreak,
	NormalizedWord
} from './models/normalized-content.model';

export type {
	NormalizedDocument
} from './models/normalized-document.model';

export {
	NormalizedDocumentValidator
} from './validation/normalized-document-validator';

export {
	NormalizedDocumentDataTypeHandler
} from './validation/normalized-document-data-type-handler';

export {
	NormalizedContentDomainObjectFactory
} from './resources/normalized-content-domain-object-factory';


export {
	NORMALIZED_DOCUMENT_OBJECT_TYPE,
	createNormalizedDocumentId,
	createNormalizedDocumentIdForDescriptor
} from './models/normalized-document-id';

export {
	NORMALIZED_CONTENT_RESOURCE_TYPE,
	NORMALIZED_DOCUMENT_DATA_TYPE,
	NORMALIZED_DOCUMENT_DATA_VERSION,
	assertNormalizedDocumentDataContract
} from './resources/normalized-content-resource-contract';

export {
	NormalizedContentService
} from './services/normalized-content.service';

export {
	NORMALIZED_CONTENT_VIEWS,
	type NormalizedContentView
} from './models/normalized-content-navigation.model';
