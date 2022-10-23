/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { NotFoundError } from '@ebec/http';
import {
    applyQuery,
    useDataSource,
} from 'typeorm-extension';
import { ExpressRequest, ExpressResponse } from '../../../../type';
import { MasterImageGroupEntity } from '../../../../../domains/core/master-image-group/entity';

export async function getOneMasterImageGroupRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(MasterImageGroupEntity);

    const entity = await repository.findOneBy({ id });

    if (!entity) {
        throw new NotFoundError();
    }

    return res.respond({ data: entity });
}

export async function getManyMasterImageGroupRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(MasterImageGroupEntity);
    const query = repository.createQueryBuilder('imageGroup');

    const { pagination } = applyQuery(query, req.query, {
        defaultAlias: 'imageGroup',
        filters: {
            allowed: ['id', 'name', 'path', 'virtual_path'],
        },
        pagination: {
            maxLimit: 50,
        },
    });

    const [entities, total] = await query.getManyAndCount();

    return res.respond({
        data: {
            data: entities,
            meta: {
                total,
                ...pagination,
            },
        },
    });
}
