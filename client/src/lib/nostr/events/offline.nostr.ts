import { api } from './api';
import { bibleStorer as storer } from '$lib/storer/bible.storer';
import { toastService } from '$lib/services/toast.service';
import { authService } from '$lib/services/auth.service';
import uuid4 from 'uuid4';
import type { Event, Filter, NostrEvent } from 'nostr-tools';
import { relayService } from '$lib/services/relay.service';
import { gzipAndHexEncode } from '$lib/utils/gzip';

export class OfflineApi {
  // --------------------------------------------------------------------------
  // GET 
  async cacheHitThenFetch(
    filter: Filter,
    key: string,
    unsyncedDB: string,
    syncedDB: string
  ): Promise<Event | null> {
    let data = await this.cacheHit(key, unsyncedDB, syncedDB);

    if (!data) {
      let content = await relayService.getContent(filter)
      data = JSON.parse(content)
    }

    return data;
  }

  async cacheHit(
    key: string,
    unsyncedDB: string,
    syncedDB: string
  ): Promise<any> {
    let data;
    try {
      data = await storer.getValue(unsyncedDB, key);
      if (!data) {
        data = await storer.getValue(syncedDB, key);
      }
    } catch (error) {
      console.log(
        `error getting value from cache [${unsyncedDB}|${syncedDB}]/${key} from indexdb: ${error}`
      );
    }
    return data;
  }

  // --------------------------------------------------------------------------
  // PUT

  async put(
    event: NostrEvent,
    data: any,
    unsyncedDB: string,
    syncedDB: string
  ): Promise<any> {
    try {
      data.version = data.version ? data.version + 1 : 1;
      let content = await gzipAndHexEncode(JSON.stringify(data));

      event.created_at = Math.floor(Date.now() / 1000)
      event.content = content
      event.tags.push(["m", "json.gz.hex"])

      await relayService.publishEvent(event)
      storer.deleteValue(unsyncedDB, data.id);
      await storer.putValue(syncedDB, data)

      return data;
    } catch (error) {
      return await this.onFailurePut(data, unsyncedDB, error);
    }
  }

  async onFailurePut(
    data: any,
    unsyncedDB: string,
    error: any
  ): Promise<any> {
    if (!data?.id) {
      data.id = uuid4();
      data.dateCreated;
    }
    console.log(
      `error putting  ${data?.id}: storing to unsynced cache:  ${error}: `
    );
    data.version = data.version - 1;

    let toastMessage =
      'Offline Mode: error saving data to server. Storing locally.';
    toastService.showToast(toastMessage);
    await storer.putValue(unsyncedDB, data);
    return data;
  }

  // --------------------------------------------------------------------------
  // DELETE
  async delete(
    id: string,
    filter: Filter,
    kind: number,
    unsyncedDB: string,
    syncedDB: string
  ): Promise<any> {
    try {
      let event = await relayService.getEvent(filter)
      if (event) {
        let deleteEvent: NostrEvent = {
          "kind": 5,
          "content": "Content deleted",
          created_at: Math.floor(Date.now() / 1000),
          "tags": [
            ["e", `${event.id}`],
            ["k", `${kind}`],
            ["app", "KJVOnly"],
            ["unsyncedDB", `${unsyncedDB}`],
            ["syncedDB", `${syncedDB}`],
            ["idToDelete", `${id}`]
          ],
        }
        await relayService.publishEvent(deleteEvent)
        await storer.deleteValue(unsyncedDB, id);
        await storer.deleteValue(syncedDB, id);
      }

    } catch (error) {
      this.onDeleteFailure(id, unsyncedDB, syncedDB, error)
    }
  }

  async onDeleteFailure(id: string, unsyncedDB: string, syncedDB: string, error: any): Promise<void> {
    let data = {
      id: id,
      // dateDelete is so we can filtered out deletes that are not
      // synced yet. The server will contain a delete event with this id
      // once synced.
      dateDeleted: Date.now()
    };

    await storer.putValue(unsyncedDB, data);
    await storer.deleteValue(syncedDB, id);
    let toastMessage =
      'Offline Mode: error deleting item. Will try again later.';
    toastService.showToast(toastMessage);
    console.log(`Failed to delete : ${error}`);
  }
}

export let offlineApi = new OfflineApi();
