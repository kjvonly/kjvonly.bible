import {
	NavigationService
} from './navigation.service';

export class NavigationServiceFactory {
	create(): NavigationService {
		return new NavigationService();
	}
}
