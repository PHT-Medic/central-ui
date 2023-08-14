/*
 * Copyright (c) 2022-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from 'smob';
import type { Ref } from 'vue';
import type { EntityListMeta } from '../type';

export function buildEntityListCreatedHandler<T>(
    items: Ref<T[]>,
    meta: Ref<EntityListMeta>,
    cb?: (entity: T, meta: EntityListMeta) => void | Promise<void>,
) {
    return (item: T, options?: { unshift?: boolean}) => {
        options = options || {};

        let index : number;
        if (isObject(item)) {
            index = items.value.findIndex(
                (el: T) => (el as Record<string, any>).id === (item as Record<string, any>).id,
            );
        } else {
            index = -1;
        }

        if (index === -1) {
            if (typeof meta.value.total !== 'undefined') {
                meta.value.total++;
            }

            if (options.unshift) {
                items.value.unshift(item);
            } else {
                items.value.push(item);
            }

            if (cb) {
                cb(item, meta.value);
            }
        }
    };
}

export function buildEntityListUpdatedHandler<T>(items: Ref<T[]>) {
    return (item: T) => {
        if (!isObject(item)) {
            return;
        }

        const index = items.value.findIndex((el: T) => (el as Record<string, any>).id === (item as Record<string, any>).id);

        if (index !== -1) {
            const keys = Object.keys(item) as (keyof T)[];
            for (let i = 0; i < keys.length; i++) {
                items.value[index][keys[i]] = item[keys[i]];
            }
        }
    };
}

export function buildEntityListDeletedHandler<T>(
    items: Ref<T[]>,
    meta: Ref<EntityListMeta>,
) {
    return (item: T) : T | undefined => {
        if (!isObject(item)) {
            return undefined;
        }

        const index = items.value.findIndex((el: T) => (el as Record<string, any>).id === (item as Record<string, any>).id);
        if (index !== -1) {
            if (typeof meta.value.total !== 'undefined') {
                meta.value.total--;
            }

            return items.value.splice(index, 1).pop();
        }

        return undefined;
    };
}