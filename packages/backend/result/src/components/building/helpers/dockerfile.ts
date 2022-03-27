/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    HTTPClient,
    MasterImage,
    Train, TrainContainerPath, TrainFile, getHostNameFromString,
} from '@personalhealthtrain/central-common';
import path from 'path';
import { useClient } from '@trapi/client';
import { BuildingError } from '../error';

type DockerFileBuildContext = {
    entity: Pick<Train, 'id' | 'master_image_id' | 'entrypoint_file_id'>,
    hostname: string
};

export async function buildDockerFile(context: DockerFileBuildContext) : Promise<string> {
    const client = useClient<HTTPClient>();

    let entryPoint : TrainFile;

    try {
        entryPoint = await client.trainFile.getOne(context.entity.id, context.entity.entrypoint_file_id);
    } catch (e) {
        throw BuildingError.entrypointNotFound();
    }

    let masterImage : MasterImage;

    try {
        masterImage = await client.masterImage.getOne(context.entity.master_image_id);
    } catch (e) {
        throw BuildingError.masterImageNotFound();
    }

    const entrypointPath = path.posix.join(
        entryPoint.directory,
        entryPoint.name,
    );

    let entrypointCommand = masterImage.command;
    let entrypointCommandArguments = masterImage.command_arguments;

    const { data: masterImageGroups } = await client.masterImageGroup.getMany({
        filter: {
            virtual_path: masterImage.group_virtual_path,
        },
    });

    if (masterImageGroups.length > 0) {
        const masterImageGroup = masterImageGroups.shift();
        if (masterImageGroup) {
            entrypointCommand = entrypointCommand || masterImageGroup.command;
            entrypointCommandArguments = entrypointCommandArguments || masterImageGroup.command_arguments;
        }
    }

    let argumentsString = '';

    if (entrypointCommandArguments) {
        let parts = Array.isArray(entrypointCommandArguments) ?
            entrypointCommandArguments :
            [entrypointCommandArguments];

        parts = parts.map((part) => `"${part}"`);
        argumentsString = `${parts.join(', ')} `;
    }

    return `
    FROM ${getHostNameFromString(context.hostname)}/master/${masterImage.virtual_path}
    RUN mkdir ${TrainContainerPath.MAIN} &&\
        mkdir ${TrainContainerPath.RESULTS} &&\
        chmod -R +x ${TrainContainerPath.MAIN}

    CMD ["${entrypointCommand}", ${argumentsString}"${path.posix.join(TrainContainerPath.MAIN, entrypointPath)}"]
    `;
}