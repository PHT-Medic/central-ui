/*
 * Copyright (c) 2022-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineComponent, h } from 'vue';
import type { ProposalStation } from '@personalhealthtrain/central-common';
import {
    DomainType,
} from '@personalhealthtrain/central-common';
import { createEntityManager, defineEntityManagerEvents } from '../../core';

export default defineComponent({
    props: {
        proposalId: {
            type: String,
            required: true,
        },
        stationId: {
            type: String,
            required: true,
        },
        realmId: String,
    },
    emits: defineEntityManagerEvents<ProposalStation>(),
    async setup(props, setup) {
        const manager = createEntityManager({
            type: `${DomainType.PROPOSAL_STATION}`,
            setup,
            props: {
                where: {
                    proposal_id: props.proposalId,
                    station_id: props.stationId,
                },
            },
            socket: {
                processEvent(event) {
                    return event.data.proposal_id === props.proposalId;
                },
            },
        });

        return () => h('button', {
            class: ['btn btn-xs', {
                'btn-success': !manager.data.value,
                'btn-danger': manager.data.value,
            }],
            onClick($event: any) {
                $event.preventDefault();

                if (manager.data.value) {
                    return manager.delete();
                }

                return manager.create({
                    proposal_id: props.proposalId,
                    station_id: props.stationId,
                });
            },
        }, [
            h('i', {
                class: ['fa', {
                    'fa-plus': !manager.data.value,
                    'fa-trash': manager.data.value,
                }],
            }),
        ]);
    },
});