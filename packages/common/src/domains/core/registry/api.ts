/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { ClientDriverInstance } from 'hapic';
import type { Registry } from './entity';
import type { CollectionResourceResponse, SingleResourceResponse } from '../../type';
import { nullifyEmptyObjectProperties } from '../../../utils';

export class RegistryAPI {
    protected client: ClientDriverInstance;

    constructor(client: ClientDriverInstance) {
        this.client = client;
    }

    async getMany(options?: BuildInput<Registry>): Promise<CollectionResourceResponse<Registry>> {
        const response = await this.client.get(`registries${buildQuery(options)}`);

        return response.data;
    }

    async getOne(id: Registry['id'], options?: BuildInput<Registry>): Promise<SingleResourceResponse<Registry>> {
        const response = await this.client.get(`registries/${id}${buildQuery(options)}`);

        return response.data;
    }

    async create(data: Record<string, any>): Promise<SingleResourceResponse<Registry>> {
        const response = await this.client.post('registries', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async update(id: Registry['id'], data: Record<string, any>): Promise<SingleResourceResponse<Registry>> {
        const response = await this.client.post(`registries/${id}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async delete(id: Registry['id']): Promise<SingleResourceResponse<Registry>> {
        const response = await this.client.delete(`registries/${id}`);

        return response.data;
    }
}
