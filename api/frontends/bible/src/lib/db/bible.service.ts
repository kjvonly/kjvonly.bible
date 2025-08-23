import { bibleDB } from './bible.db';

export class BibleService {

    /**
     * 
     * @param objectStoreName 
     * @param id 
     * @returns data of the id in that objectstorename
     */
    async getValue(objectStoreName: string, id: string): Promise<any> {
        await bibleDB.ready
        return await bibleDB.getValue(objectStoreName, id)
    }

        /**
     * 
     * @param objectStoreName 
     * @param id 
     * @returns data of the id in that objectstorename
     */
    async getValueIfCacheIsReady(objectStoreName: string, id: string): Promise<any> {
        if (bibleDB.isReady){
            return this.getValue(objectStoreName, id)
        }
    }

    /**
     * 
     * @param objectStoreName 
     * @returns data of the id in that objectstorename
     */
    async getAllValue(objectStoreName: string): Promise<any> {
        await bibleDB.ready
        return await bibleDB.getAllValue(objectStoreName)

    }

    /**
    * 
    * @param objectStoreName 
    * @param data to store. id variable of data is the key.
    * @returns 
    */
    async putValue(objectStoreName: string, data: any): Promise<any> {
        await bibleDB.ready
        await bibleDB.putValue(objectStoreName, data)

        if (data.dateUpdated){
            let dateUpdatedData ={
                id: 'lastDateUpdated',
                timestamp: data.dateUpdated
            }
            await bibleDB.putValue(objectStoreName, dateUpdatedData)
        }
    }

    /**
     * 
     * @param objectStoreName 
     * @param data to store. id variable of data is the key.
     * @returns 
     */
    async putBulkValue(objectStoreName: string, data: any): Promise<any> {
        await bibleDB.ready
        await bibleDB.putBulkValue(objectStoreName, data)
    }

        /**
    * 
    * @param objectStoreName 
    * @param data to store. id variable of data is the key.
    * @returns 
    */
    async deleteValue(objectStoreName: string, id: string): Promise<any> {
        await bibleDB.ready
        await bibleDB.deleteValue(objectStoreName, id)
    }

}

export let bibleService = new BibleService()