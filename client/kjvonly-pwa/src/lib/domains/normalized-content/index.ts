export type {
	NormalizedAnchor,
	NormalizedBlock,
	NormalizedCaptionBlock,
	NormalizedClassName,
	NormalizedContent,
	NormalizedFigureBlock,
	NormalizedFlowBlock,
	NormalizedHeadingBlock,
	NormalizedHeadingLevel,
	NormalizedLineBreak,
	NormalizedListBlock,
	NormalizedListItemBlock,
	NormalizedMark,
	NormalizedParagraphBlock,
	NormalizedPreformattedBlock,
	NormalizedQuoteBlock,
	NormalizedTableBlock,
	NormalizedTableCellBlock,
	NormalizedTableRowBlock,
	NormalizedTextBlock,
	NormalizedThematicBreakBlock,
	NormalizedWord,
	NormalizedDocument
} from '@kjvonly/normalized-content';

export {
	NormalizedDocumentValidator
} from '@kjvonly/normalized-content';

export type {
	NormalizedContentAddress
} from './models/normalized-content-address.model';

export {
	resolveNormalizedContentAtAddress,
	assertNormalizedContentWordAddress
} from './models/normalized-content-address.model';

export type {
	NormalizedContentTextMarkup,
	NormalizedContentTextMarkupContentMap,
	NormalizedContentTextMarkupDocumentReference,
	NormalizedContentTextMarkupIdentity,
	NormalizedContentTextMarkupMap,
	NormalizedContentTextMarkupMarking
} from './models/normalized-content-text-markup.model';

export {
	NORMALIZED_CONTENT_TEXT_MARKUP_OBJECT_TYPE,
	createNormalizedContentTextMarkupId,
	getNormalizedContentTextMarkupMarking,
	parseNormalizedContentTextMarkupId
} from './models/normalized-content-text-markup.model';

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
	NormalizedContentTextMarkupDataTypeHandler
} from './resources/text-markup/normalized-content-text-markup-data-type-handler';

export {
	NormalizedContentTextMarkupDomainObjectFactory
} from './resources/text-markup/normalized-content-text-markup-domain-object-factory';

export {
	NormalizedContentTextMarkupResourcePublication
} from './resources/text-markup/normalized-content-text-markup-resource-publication';

export {
	NORMALIZED_CONTENT_TEXT_MARKUP_DATA_TYPE,
	NORMALIZED_CONTENT_TEXT_MARKUP_DATA_VERSION,
	NORMALIZED_CONTENT_TEXT_MARKUP_RESOURCE_TYPE,
	createNormalizedContentTextMarkupResourceId,
	parseNormalizedContentTextMarkupResourceId,
	type NormalizedContentTextMarkupResourceIdentity
} from './resources/text-markup/normalized-content-text-markup-resource';

export {
	NormalizedContentService
} from './services/normalized-content.service';

export {
	NormalizedContentTextMarkupService
} from './services/normalized-content-text-markup.service';

export {
	NORMALIZED_CONTENT_VIEWS,
	type NormalizedContentView
} from './models/normalized-content-navigation.model';

export {
	normalizedContentResourceModuleRegistrations
} from './modules/runtime/normalized-content-resource-module-registrations';
