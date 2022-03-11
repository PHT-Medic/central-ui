/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PermissionID } from '@personalhealthtrain/central-common';
import { ForbiddenError, NotFoundError } from '@typescript-error/http';
import { getRepository } from 'typeorm';
import { ExpressRequest, ExpressResponse } from '../../../../type';
import { MasterImageEntity } from '../../../../../domains/core/master-image/entity';

export async function deleteMasterImageRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    if (!req.ability.hasPermission(PermissionID.MASTER_IMAGE_MANAGE)) {
        throw new ForbiddenError();
    }

    const repository = getRepository(MasterImageEntity);

    const entity = await repository.findOne(id);

    if (typeof entity === 'undefined') {
        throw new NotFoundError();
    }

    const { id: entityId } = entity;

    await repository.delete(entity.id);

    entity.id = entityId;

    return res.respondDeleted({ data: entity });
}
