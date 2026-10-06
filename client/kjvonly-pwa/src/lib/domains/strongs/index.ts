export type {
	Strongs,
	StrongsContent,
	UsageBy
} from './models/strongs.model';

export {
	newStrongs
} from './models/strongs.model';

export {
	StrongsService
} from './services/strongs.service';


export {
	createStrongsResourceId,
	parseStrongsResourceId
} from './resources/strongs-resource-id';

export {
	STRONGS_DATA_TYPE,
	STRONGS_DATA_VERSION,
	STRONGS_RESOURCE_TYPE
} from './resources/definitions/strongs-resource-contract';

export {
	StrongsDataTypeHandler,
	StrongsDefinitionDataTypeHandler
} from './resources/definitions/strongs-data-type-handler';

export {
	StrongsDomainObjectFactory
} from './resources/definitions/strongs-domain-object-factory';

export {
	StrongsModuleResourceSelectionContributor
} from './resources/strongs-module-resource-selection-contributor';
