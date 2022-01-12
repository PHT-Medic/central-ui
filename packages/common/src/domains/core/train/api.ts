/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuildInput, buildQuery } from '@trapi/query';
import {
    APIType,
    ApiRequestConfig,
    CollectionResourceResponse,
    SingleResourceResponse,
    useAPI,
} from '../../../modules';
import { Train } from './entity';
import { TrainCommand } from './type';
import { nullifyEmptyObjectProperties } from '../../../utils';

export async function getAPITrains(options?: BuildInput<Train>) : Promise<CollectionResourceResponse<Train>> {
    const { data: response } = await useAPI(APIType.DEFAULT).get(`trains${buildQuery(options)}`);
    return response;
}

export async function getAPITrain(
    id: Train['id'],
    options?: BuildInput<Train>,
    requestConfig?: ApiRequestConfig,
) : Promise<SingleResourceResponse<Train>> {
    const { data: response } = await useAPI(APIType.DEFAULT)
        .get(`trains/${id}${buildQuery(options)}`, requestConfig);

    return response;
}

export async function dropAPITrain(id: Train['id']) : Promise<SingleResourceResponse<Train>> {
    const { data: response } = await useAPI(APIType.DEFAULT).delete(`trains/${id}`);

    return response;
}

export async function editAPITrain(id: Train['id'], data: Partial<Train>) : Promise<SingleResourceResponse<Train>> {
    const { data: response } = await useAPI(APIType.DEFAULT).post(`trains/${id}`, nullifyEmptyObjectProperties(data));

    return response;
}

export async function addAPITrain(data: Partial<Train>) : Promise<SingleResourceResponse<Train>> {
    const { data: response } = await useAPI(APIType.DEFAULT).post('trains', nullifyEmptyObjectProperties(data));

    return response;
}

export async function runAPITrainCommand(
    id: Train['id'],
    command: TrainCommand,
    data: Record<string, any> = {},
) : Promise<SingleResourceResponse<Train>> {
    const actionData = {
        command,
        ...data,
    };

    const { data: response } = await useAPI(APIType.DEFAULT)
        .post(`trains/${id}/command`, actionData);

    return response;
}
