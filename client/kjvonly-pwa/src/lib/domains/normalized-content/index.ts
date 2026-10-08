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
	resolveNormalizedContentAtAddress
} from './models/normalized-content-address.model';

export type {
	NormalizedContentTextMarkupContentMap,
	NormalizedContentTextMarkupMap,
	NormalizedContentTextMarkupMarking
} from './models/normalized-content-text-markup.model';

export {
	getNormalizedContentTextMarkupMarking
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
	NormalizedContentService
} from './services/normalized-content.service';

export {
	NORMALIZED_CONTENT_VIEWS,
	type NormalizedContentView
} from './models/normalized-content-navigation.model';
