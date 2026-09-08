# Nostr

## Sync workers

Originally, we synced data on app start. New data was stored in indexedDB either in the synced or unsynced table for
the appropriate data type. We'd use lastSyncTime to pull the latest data to the client.

## Relays

Now relays do not have to persist data so we have some options. A relay that allows persistent storage for some
user or no users. A relay that allows users to persist for an interval of time. A relay that is just used for syncing
user data across devices without any persistence.
