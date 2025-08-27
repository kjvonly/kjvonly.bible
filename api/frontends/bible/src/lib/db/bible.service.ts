import { bibleDB } from './bible.db';

export class BibleService {

    LAST_DATE_UPDATED_ID = 'lastDateUpdated'

    bibleDB = bibleDB
    /**
     *
     */
    constructor(db: any) {
        this.bibleDB = db
    }

    /**
     * 
     * @param objectStoreName 
     * @param id 
     * @returns data of the id in that objectstorename
     */
    async getValue(objectStoreName: string, id: string): Promise<any> {
        await this.bibleDB.ready
        return await this.bibleDB.getValue(objectStoreName, id)
    }

        /**
     * 
     * @param objectStoreName 
     * @param id 
     * @returns data of the id in that objectstorename
     */
    async getValueIfCacheIsReady(objectStoreName: string, id: string): Promise<any> {
        if (this.bibleDB.isReady){
            return this.getValue(objectStoreName, id)
        }
    }

    /**
     * 
     * @param objectStoreName 
     * @returns data of the id in that objectstorename
     */
    async getAllValue(objectStoreName: string): Promise<any> {
        await this.bibleDB.ready
        return await this.bibleDB.getAllValue(objectStoreName)

    }

    /**
    * 
    * @param objectStoreName 
    * @param data to store. id variable of data is the key.
    * @returns 
    */
    async putValue(objectStoreName: string, data: any): Promise<any> {
        await this.bibleDB.ready
        await this.bibleDB.putValue(objectStoreName, data)
    }

    /**
     * 
     * @param objectStoreName 
     * @param data to store. id variable of data is the key.
     * @returns 
     */
    async putBulkValue(objectStoreName: string, data: any): Promise<any> {
        await this.bibleDB.ready
        await this.bibleDB.putBulkValue(objectStoreName, data)
    }

        /**
    * 
    * @param objectStoreName 
    * @param data to store. id variable of data is the key.
    * @returns 
    */
    async deleteValue(objectStoreName: string, id: string): Promise<any> {
        await this.bibleDB.ready
        await this.bibleDB.deleteValue(objectStoreName, id)
    }

}

export let bibleService = new BibleService(bibleDB)