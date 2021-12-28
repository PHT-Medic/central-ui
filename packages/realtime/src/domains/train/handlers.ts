/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    MASTER_REALM_ID, PermissionID, Train, buildSocketProposalStationRoomName, buildSocketTrainRoomName, getAPITrain,
} from '@personalhealthtrain/ui-common';
import { UnauthorizedError } from '@typescript-error/http';
import { stringifyAuthorizationHeader } from '@typescript-auth/core';
import { SocketInterface, SocketNamespaceInterface, SocketServerInterface } from '../../config/socket/type';

export function registerTrainSocketHandlers(
    io: SocketServerInterface | SocketNamespaceInterface,
    socket: SocketInterface,
) {
    if (!socket.data.user) return;

    socket.on('trainsSubscribe', async (context, cb) => {
        context ??= {};

        if (
            !socket.data.ability.hasPermission(PermissionID.TRAIN_DROP) &&
            !socket.data.ability.hasPermission(PermissionID.TRAIN_EDIT) &&
            !socket.data.ability.hasPermission(PermissionID.TRAIN_EXECUTION_START) &&
            !socket.data.ability.hasPermission(PermissionID.TRAIN_EXECUTION_STOP)
        ) {
            if (typeof cb === 'function') {
                cb(new UnauthorizedError());
            }

            return;
        }

        socket.join(buildSocketTrainRoomName(context.id));

        if (typeof cb === 'function') {
            cb();
        }
    });

    socket.on('trainsUnsubscribe', (context) => {
        context ??= {};

        socket.leave(buildSocketTrainRoomName(context.id));
    });
}
