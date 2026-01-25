import { first } from "$lib/utils/arrays"
import { localStorageService } from "./localStorage.service"

export interface Identity {
  type: string
  pubkey: string
}
export class IdentityService {

  getIdentity(): string | null {
    return localStorageService.get('identity')
  }

}

export const identityService = new IdentityService()
