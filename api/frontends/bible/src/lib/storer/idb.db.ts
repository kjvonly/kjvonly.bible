import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';

/**
 * Base class for interfacing with indexedDB
 */
class IndexedDB {
	private database: string;
	protected db: IDBPDatabase<unknown> | undefined
	constructor(database: string) {
		this.database = database;
	}

	/**
	 * Creates and or opens data object store. the name of the object store is part of the IndexDb constructor.
	 * @param tableNames list of tables that should exist in db
	 * @returns boolean if creation/opening was successfull
	 */
	public async createAndOrOpenObjectStores(tableNames: string[]) {
		try {
			this.db = await openDB(this.database, 7, {
				upgrade(db: IDBPDatabase) {
					for (const tableName of tableNames) {
						if (db.objectStoreNames.contains(tableName)) {
							continue;
						}
						db.createObjectStore(tableName, { autoIncrement: true, keyPath: 'id' });
					}
				}
			});
			return true;
		} catch (error) {
			console.log(error)
			return false;
		}
	}

	/**
	 * Get value from indexDB
	 * 
	 * @param tableName table to get value from
	 * @param id index id or key
	 * @returns the value at that key
	 */
	public async getValue(tableName: string, id: string) {
		const tx = this.db?.transaction(tableName, 'readonly');
		const store = tx?.objectStore(tableName);
		const result = await store?.get(id);
		return result;
	}

	/**
	 * Get all objects from a table
	 * 
	 * @param tableName table to get all values from
	 * @returns all objects
	 */
	public async getAllValue(tableName: string) {
		const tx = this.db?.transaction(tableName, 'readonly');
		const store = tx?.objectStore(tableName);
		const result = await store?.getAll();
		return result;
	}


	/**
	 * Put value in table
	 * 
	 * @param tableName table to put values
	 * @param value value to put
	 * @returns 
	 */
	public async putValue(tableName: string, value: object) {
		const tx = this.db?.transaction(tableName, 'readwrite');
		const store = tx?.objectStore(tableName);
		const result = await store?.put(value);
		return result;
	}

	/**
	 * Puts all objects in table
	 * @param tableName talbe to put values
	 * @param values array of values to put in table
	 * @returns 
	 */
	public async putBulkValue(tableName: string, values: object[]) {
		const tx = this.db?.transaction(tableName, 'readwrite');
		const store = tx?.objectStore(tableName);
		for (const value of values) {
			const result = await store?.put(value);
		}
		return this.getAllValue(tableName);
	}

	/**
	 * 
	 * @param tableName table to delete value from
	 * @param id id/key of to delete
	 * @returns id of result or undefined
	 */
	public async deleteValue(tableName: string, id: string) {
		const tx = this.db?.transaction(tableName, 'readwrite');
		const store = tx?.objectStore(tableName);
		const result = await store?.get(id);
		if (!result) {
			return result;
		}
		await store?.delete(id);
		return id;
	}



	/**
	 * Get's all keys from a table
	 * 
	 * @param tableName table to get all index keys
	 * @returns list of keys
	 */
	public async getAllKeys(tableName: string): Promise<IDBValidKey[]> {
		if (this.db) {
			return await this.db.getAllKeys(tableName);
		}
		return []
	}
}

export default IndexedDB;
