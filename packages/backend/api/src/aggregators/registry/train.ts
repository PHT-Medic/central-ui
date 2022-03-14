/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Message } from 'amqp-extension';
import { getRepository } from 'typeorm';
import { TrainBuildStatus, TrainRunStatus } from '@personalhealthtrain/central-common';
import { TrainEntity } from '../../domains/core/train/entity';
import { TrainStationEntity } from '../../domains/core/train-station/entity';
import { AggregatorRegistryEvent, AggregatorTrainEventPayload } from '../../domains/special/aggregator';

export async function handleRegistryTrainEvent(message: Message) {
    const repository = getRepository(TrainEntity);

    const data : AggregatorTrainEventPayload = message.data as AggregatorTrainEventPayload;

    const entity = await repository.findOne(data.id);

    switch (message.type) {
        case AggregatorRegistryEvent.TRAIN_INITIALIZED:
            entity.build_status = TrainBuildStatus.FINISHED;

            entity.run_station_index = null;
            entity.run_station_id = null;
            break;
        case AggregatorRegistryEvent.TRAIN_MOVED:
            entity.run_status = TrainRunStatus.RUNNING;
            break;
        case AggregatorRegistryEvent.TRAIN_FINISHED:
            entity.run_status = TrainRunStatus.FINISHED;
            entity.run_station_id = null;
            entity.run_station_index = null;
            break;
    }

    await repository.save(entity);

    if (message.type === AggregatorRegistryEvent.TRAIN_MOVED) {
        const trainStationRepository = getRepository(TrainStationEntity);
        const trainStation = await trainStationRepository.findOne({
            train_id: data.id,
            station_id: data.stationId,
        });

        if (typeof trainStation !== 'undefined') {
            trainStation.run_status = data.status;
            trainStation.artifact_digest = data.artifactDigest;
            trainStation.artifact_tag = data.artifactTag;

            await trainStationRepository.save(trainStation);
        }
    }
}
