import { api } from './api'
import { bibleStorer as storer } from '../storer/bible.storer';
import { toastService } from '$lib/services/toast.service';
import { authService } from '$lib/services/auth.service';

export class OfflineApi {

    async sync(path: string, unsyncedDB: string, syncedDB: string) {
        let lastDateUpdated = 0
        let dateUpdatedSynced = 0
        try {
            let ldu = await storer.getValue(syncedDB, storer.LAST_DATE_UPDATED_ID)
            if (ldu !== undefined) {
                lastDateUpdated = ldu.timestamp + 1
            }
            let shouldContinue = true
            let currentPage = 1
            let rows = 10


            while (shouldContinue) {
                let resp = await api.get(`${path}?start_updated_date=${lastDateUpdated}&orderBy=date_updated,ASC&page=${currentPage}&rows=${rows}`)
                if (resp.ok) {
                    let page = await resp.json()
                    for (let i = 0; i < page.items.length; i++) {
                        if (page.items[i].dateDeleted > 0) {
                            await storer.deleteValue(syncedDB, page.items[i].id)
                            await storer.deleteValue(unsyncedDB, page.items[i].id)
                            dateUpdatedSynced = page.items[i].dateUpdated
                        } else {
                            await storer.putValue(syncedDB, page.items[i])
                            dateUpdatedSynced = page.items[i].dateUpdated
                        }
                    }

                    if (currentPage < Math.round(page.total / rows)) {
                        currentPage = currentPage + 1
                    } else {
                        shouldContinue = false
                    }

                } else {
                    shouldContinue = false
                    console.log(`error syncing annotations from server: ${await resp.json()}`)
                }
            }

        } catch (error) {
            console.log(`error getting ${path} from ${lastDateUpdated} from server: ${error}`)
        }

        if (dateUpdatedSynced) {
            let dateUpdatedData = {
                id: storer.LAST_DATE_UPDATED_ID,
                timestamp: dateUpdatedSynced
            }
            await storer.putValue(syncedDB, dateUpdatedData)
        }

        let unsyncedEntries = await storer.getAllValue(unsyncedDB)
        for (let i = 0; i < unsyncedEntries.length; i++) {
            let e = unsyncedEntries[i]
            if (e.dateDeleted > 0) {
                this.delete(e, path, unsyncedDB, syncedDB)
            }
            await this.put(e, path, unsyncedDB, syncedDB)
        }
    }

    async fetch(path: string): Promise<any> {
        let data
        try {
            let resp = await api.get(path)
            if (resp.ok) {
                data = await resp.json()
            }
        } catch (error) {
            console.log(`error getting ${path} from server: ${error}`)
        }
        return data;
    }

    async cacheHitThenFetch(path: string, key: string, unsyncedDB: string, syncedDB: string): Promise<any> {
        let data = await this.cacheHit(key, unsyncedDB, syncedDB)
     
        if (!data) {
            return await api.getstatic(path);
        }

        return data;
    }

    async cacheHit(key: string, unsyncedDB: string, syncedDB: string): Promise<any> {
        let data
        try {
            data = await storer.getValue(unsyncedDB, key)
            if (!data) {
                data = await storer.getValue(syncedDB, key)
            }
        } catch (error) {
            console.log(`error getting value from cache [${unsyncedDB}|${syncedDB}]/${key} from indexdb: ${error}`)
        }
        return data;
    }


    async put(data: any, path: string, unsyncedDB: string, syncedDB: string): Promise<any> {
        try {
            data.version = data.version + 1
            var result: Response

            if (data.version == 1) {
                result = await api.post(path, data)
            } else {
                result = await api.update(`${path}/${data.id}`, data)
            }

            if (!result.ok) {
                // BAD REQUEST or Already Exists
                if (result.status === 400 || result.status === 409) {
                    let annots = await this.fetch(`${path}/${data.id}`)
                    if (annots !== undefined) {
                        storer.deleteValue(unsyncedDB, data.id)
                        storer.putValue(syncedDB, annots)
                    }
                    toastService.showToast("Discarded stale versions. Please update lastest version.")
                    return annots
                } else {
                    return await this.onFailurePut(result.status, data, unsyncedDB, `status code ${result.status}, expected 200`)
                }
            }
            else {
                storer.deleteValue(unsyncedDB, data.id)
            }

            let obj = await result.json()

            await storer.putValue(syncedDB, obj)

            return obj

        } catch (error) {
            return await this.onFailurePut(undefined, data, unsyncedDB, error)
        }
    }

    async onFailurePut(statusCode: number | undefined, data: any, unsyncedDB: string, error: any): Promise<any> {
        console.log(`error putting  ${data?.id}: storing to unsynced cache:  ${error}: `)
        data.version = data.version - 1

        let toastMessage = "Offline Mode: sync will occur when service is reachable."
        if (statusCode === 401) {
            if (authService.hasLoggedIn()) {
                toastMessage = "Offline Mode: sign in again to save changes."
            } else {
                toastMessage = "Offline Mode: sign in to save changes."
            }
        }
        toastService.showToast(toastMessage)
        await storer.putValue(unsyncedDB, data)
        return data
    }

    async delete(data: any, path: string, unsyncedDB: string, syncedDB: string): Promise<any> {
        try {
            let result = await api.delete(`${path}/${data.id}`)

            if (result.ok) {
                await storer.deleteValue(unsyncedDB, data.id)
                await storer.deleteValue(syncedDB, data.id)
            } else {
                await storer.putValue(unsyncedDB, data)
                await storer.deleteValue(syncedDB, data.id)
                console.log(`Failed to delete ${path}/${data.id}`)
            }
        } catch (error) {
            console.log(`Failed to delete ${path}/${data.id}: ${error}`)
        }
    }
}

export let offlineApi = new OfflineApi()