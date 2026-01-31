import { api } from './api';
import { bibleStorer as storer } from '$lib/storer/bible.storer';
import { toastService } from '$lib/services/toast.service';
import { authService } from '$lib/services/auth.service';
import uuid4 from 'uuid4';
import { relayService } from '$lib/nostr/services/relay.service';
import type { Nostr, NostrEvent } from 'nostr-tools';
import { gzipAndHexEncode } from '$lib/utils/gzip';

// CORE NOTE: We do soft deletes server side so we can sync the delete
// across devices. Periodically, the server will remove the soft deletes.
export class OfflineApi {
  async sync(path: string, unsyncedDB: string, syncedDB: string) {
    let lastDateUpdated = 0;
    let dateUpdatedSynced = 0;
    try {
      let ldu = await storer.getValue(syncedDB, storer.LAST_DATE_UPDATED_ID);
      if (ldu !== undefined) {
        lastDateUpdated = ldu.timestamp + 1;
      }
      let shouldContinue = true;
      let currentPage = 1;
      let rows = 10;

      while (shouldContinue) {
        let resp = await api.get(
          `${path}?start_updated_date=${lastDateUpdated}&orderBy=date_updated,ASC&page=${currentPage}&rows=${rows}`
        );
        if (resp.ok) {
          let page = await resp.json();
          for (let i = 0; i < page.items.length; i++) {
            if (page.items[i].dateDeleted > 0) {
              await storer.deleteValue(syncedDB, page.items[i].id);
              await storer.deleteValue(unsyncedDB, page.items[i].id);
              dateUpdatedSynced = page.items[i].dateUpdated;
            } else {
              await storer.putValue(syncedDB, page.items[i]);
              dateUpdatedSynced = page.items[i].dateUpdated;
            }
          }

          if (currentPage < Math.round(page.total / rows)) {
            currentPage = currentPage + 1;
          } else {
            shouldContinue = false;
          }
        } else {
          shouldContinue = false;
          console.log(
            `error syncing annotations from server: ${await resp.json()}`
          );
        }
      }
    } catch (error) {
      console.log(
        `error getting ${path} from ${lastDateUpdated} from server: ${error}`
      );
    }

    if (dateUpdatedSynced) {
      let dateUpdatedData = {
        id: storer.LAST_DATE_UPDATED_ID,
        timestamp: dateUpdatedSynced
      };
      await storer.putValue(syncedDB, dateUpdatedData);
    }

    let unsyncedEntries = await storer.getAllValue(unsyncedDB);
    for (let i = 0; i < unsyncedEntries.length; i++) {
      let e = unsyncedEntries[i];
      if (e.dateDeleted > 0) {
        this.delete(e, path, unsyncedDB, syncedDB);
      }
      await this.put(e, path, unsyncedDB, syncedDB);
    }
  }

  async fetch(path: string): Promise<any> {
    let data;
    try {
      let resp = await api.get(path);
      if (resp.ok) {
        data = await resp.json();
      }
    } catch (error) {
      console.log(`error getting ${path} from server: ${error}`);
    }
    return data;
  }

  async cacheHitThenFetch(
    path: string,
    key: string,
    unsyncedDB: string,
    syncedDB: string
  ): Promise<any> {
    let data = await this.cacheHit(key, unsyncedDB, syncedDB);

    if (!data) {
      return await api.getstatic(path);
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
      await storer.putValue(syncedDB, data);

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

  async delete(
    id: string,
    path: string,
    unsyncedDB: string,
    syncedDB: string
  ): Promise<any> {
    try {
      let result = await api.delete(`${path}/${id}`);

      if (result.ok) {
        await storer.deleteValue(unsyncedDB, id);
        await storer.deleteValue(syncedDB, id);
      } else {
        let data = {
          id: id,
          // dateDelete is so we can filtered out deletes that are not
          // synced yet. The server will stamp the accurate dateDelete
          // once synced.
          dateDeleted: Date.now()
        };

        await storer.putValue(unsyncedDB, data);
        await storer.deleteValue(syncedDB, id);
        console.log(`Failed to delete ${path}/${id}`);
      }
    } catch (error) {
      console.log(`Failed to delete ${path}/${id}: ${error}`);
    }
  }
}

export let offlineApi = new OfflineApi();
