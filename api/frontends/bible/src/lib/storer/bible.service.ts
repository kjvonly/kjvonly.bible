import { bibleDB } from './bible.db';

export class BibleService {

    LAST_DATE_UPDATED_ID = 'lastDateUpdated'


    /**
     * 
     * @param objectStoreName 
     * @param id 
     * @returns data of the id in that objectstorename
     */
    async getValue(objectStoreName: string, id: string): Promise<any> {
        return await bibleDB.getValue(objectStoreName, id)
    }

        /**
     * 
     * @param objectStoreName 
     * @param id 
     * @returns data of the id in that objectstorename
     */
    async getValueIfCacheIsReady(objectStoreName: string, id: string): Promise<any> {
            return this.getValue(objectStoreName, id)
    }

    /**
     * 
     * @param objectStoreName 
     * @returns data of the id in that objectstorename
     */
    async getAllValue(objectStoreName: string): Promise<any> {
        return await bibleDB.getAllValue(objectStoreName)

    }

    /**
    * 
    * @param objectStoreName 
    * @param data to store. id variable of data is the key.
    * @returns 
    */
    async putValue(objectStoreName: string, data: any): Promise<any> {
        await bibleDB.putValue(objectStoreName, data)
    }

    /**
     * 
     * @param objectStoreName 
     * @param data to store. id variable of data is the key.
     * @returns 
     */
    async putBulkValue(objectStoreName: string, data: any): Promise<any> {
        await bibleDB.putBulkValue(objectStoreName, data)
    }

    /**
    * 
    * @param objectStoreName 
    * @param data to store. id variable of data is the key.
    * @returns 
    */
    async deleteValue(objectStoreName: string, id: string): Promise<any> {
        await bibleDB.deleteValue(objectStoreName, id)
    }

}

export let bibleService = new BibleService()