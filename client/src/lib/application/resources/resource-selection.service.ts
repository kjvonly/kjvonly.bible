import type {
    PublishedResourceReference
} from '$lib/resource/models/resource.model';

import {
    parseResourceIdentifier
} from '$lib/resource/utils/resource-identifier';

import type {
    ResourceSelectionStore
} from './resource-selection-store';

import type {
    ResourceSelections
} from './resource-selections';

export class ResourceSelectionService {

    /*
     * Current selections are selections established by
     * persisted state, bootstrap initialization, or an
     * explicit user/application selection.
     *
     * These are the only selections persisted.
     */
    private readonly selections =
        new Map<
            string,
            PublishedResourceReference
        >();

    /*
     * Fallback selections are application-provided startup
     * defaults.
     *
     * They make a Resource Type immediately usable before
     * bootstrap discovery completes, but they are not
     * themselves persisted current selections.
     *
     * A bootstrap-initialized selection may therefore
     * replace a fallback, while a restored or explicitly
     * selected current value remains authoritative.
     */
    private readonly fallbackSelections =
        new Map<
            string,
            PublishedResourceReference
        >();

    constructor(
        fallbackSelections:
            readonly PublishedResourceReference[] =
            [],

        private readonly store?:
            ResourceSelectionStore
    ) {
        for (
            const selection of
            fallbackSelections
        ) {
            this.setFallbackSelection(
                selection
            );
        }
    }

    get(
        resourceType: string
    ):
        PublishedResourceReference |
        undefined {

        const selection =
            this.selections.get(
                resourceType
            ) ??
            this.fallbackSelections.get(
                resourceType
            );

        if (!selection) {
            return undefined;
        }

        return {
            ...selection
        };
    }

    require(
        resourceType: string
    ): PublishedResourceReference {

        const selection =
            this.get(
                resourceType
            );

        if (!selection) {
            throw new Error(
                `No Resource selected for type: ${resourceType}`
            );
        }

        return selection;
    }

    select(
        reference:
            PublishedResourceReference
    ): void {

        this.setSelection(
            reference
        );

        this.persist();
    }

    /*
     * Snapshot exposes the effective current application
     * selection state.
     *
     * Fallbacks are included when no current selection has
     * replaced them so callers such as module creation can
     * immediately obtain usable Resource references.
     */
    snapshot():
        ResourceSelections {

        const result:
            ResourceSelections =
            {};

        for (
            const [
                resourceType,
                reference
            ] of
            this.fallbackSelections
        ) {
            result[
                resourceType
            ] = {
                ...reference
            };
        }

        for (
            const [
                resourceType,
                reference
            ] of
            this.selections
        ) {
            result[
                resourceType
            ] = {
                ...reference
            };
        }

        return result;
    }

    restore(): void {

        const persisted =
            this.store?.load();

        if (!persisted) {
            return;
        }

        for (
            const selection of
            Object.values(
                persisted
            )
        ) {
            this.setSelection(
                selection
            );
        }
    }

    initializeMissing(
        selections:
            readonly PublishedResourceReference[]
    ): void {

        let changed =
            false;

        for (
            const reference of
            selections
        ) {
            const {
                resourceType
            } =
                parseResourceIdentifier(
                    reference.resourceId
                );

            /*
             * Only an established current selection blocks
             * bootstrap initialization.
             *
             * A fallback does not. This allows the
             * application to have an immediate startup
             * source while still accepting the default
             * advertised by the bootstrap Resource.
             */
            if (
                this.selections.has(
                    resourceType
                )
            ) {
                continue;
            }

            this.setSelection(
                reference
            );

            changed =
                true;
        }

        if (changed) {
            this.persist();
        }
    }

    private setSelection(
        reference:
            PublishedResourceReference
    ): void {

        const {
            resourceType
        } =
            parseResourceIdentifier(
                reference.resourceId
            );

        this.selections.set(
            resourceType,
            {
                ...reference
            }
        );
    }

    private setFallbackSelection(
        reference:
            PublishedResourceReference
    ): void {

        const {
            resourceType
        } =
            parseResourceIdentifier(
                reference.resourceId
            );

        this.fallbackSelections.set(
            resourceType,
            {
                ...reference
            }
        );
    }

    /*
     * Persistence intentionally excludes fallback
     * selections.
     *
     * Otherwise an application fallback could become a
     * durable user/current selection before bootstrap has
     * had the opportunity to initialize the advertised
     * default.
     */
    private persist(): void {

        if (
            this.store ===
            undefined
        ) {
            return;
        }

        const result:
            ResourceSelections =
            {};

        for (
            const [
                resourceType,
                reference
            ] of
            this.selections
        ) {
            result[
                resourceType
            ] = {
                ...reference
            };
        }

        this.store.save(
            result
        );
    }
}
