/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Train } from '@personalhealthtrain/central-common';
import { getRepository } from 'typeorm';
import { BadRequestError, NotFoundError } from '@typescript-error/http';
import { ExpressValidationResult, buildExpressValidationErrorMessage } from '../../../../express-validation';
import { TrainEntity } from '../../../../../domains/core/train/entity';

type ExpressValidationResultExtendedWithTrain = ExpressValidationResult<{
    [key: string]: any,
    train_id: Train['id']
}, {
    [key: string]: any,
    train?: TrainEntity
}>;

export async function extendExpressValidationResultWithTrain<
    T extends ExpressValidationResultExtendedWithTrain,
    >(result: T) : Promise<T> {
    if (result.data.train_id) {
        const repository = getRepository(TrainEntity);
        const entity = await repository.findOne(result.data.train_id);
        if (typeof entity === 'undefined') {
            throw new BadRequestError(buildExpressValidationErrorMessage('train_id'));
        }

        result.meta.train = entity;
    }

    return result;
}
