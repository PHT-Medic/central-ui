/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TrainBuildStatus } from '@personalhealthtrain/central-common';
import { useDataSource } from 'typeorm-extension';
import { findTrain } from './utils';
import { TrainEntity } from '../entity';

export async function stopBuildTrain(train: TrainEntity | string) : Promise<TrainEntity> {
    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(TrainEntity);

    train = await findTrain(train, repository);

    if (!train) {
        // todo: make it a ClientError.BadRequest
        throw new Error('The train could not be found.');
    }

    if (train.run_status) {
        // todo: make it a ClientError.BadRequest
        throw new Error('The train build can not longer be stopped...');
    } else {
        // if we already send a stop event, we dont send it again... :)
        if (train.build_status !== TrainBuildStatus.STOPPING) {
            // todo: implement stop routine
        }

        train = repository.merge(train, {
            build_status: train.build_status !== TrainBuildStatus.STOPPING ?
                TrainBuildStatus.STOPPING :
                TrainBuildStatus.STOPPED,
        });

        await repository.save(train);
    }

    return train;
}
