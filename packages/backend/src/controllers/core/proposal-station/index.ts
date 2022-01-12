/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getRepository } from 'typeorm';
import { applyFilters, applyPagination, applyRelations } from 'typeorm-extension';
import { check, matchedData, validationResult } from 'express-validator';
import {
    PermissionID,
    ProposalStation, ProposalStationApprovalStatus,
    isProposalStationApprovalStatus,
} from '@personalhealthtrain/ui-common';
import {
    Body, Controller, Delete, Get, Params, Post, Request, Response,
} from '@decorators/express';
import { SwaggerTags } from '@trapi/swagger';
import { BadRequestError, ForbiddenError, NotFoundError } from '@typescript-error/http';
import { onlyRealmPermittedQueryResources } from '@typescript-auth/server';
import { isPermittedForResourceRealm } from '@typescript-auth/domains';
import { DispatcherProposalEvent, emitDispatcherProposalEvent } from '../../../domains/core/proposal/queue';

import { ForceLoggedInMiddleware } from '../../../config/http/middleware/auth';
import env from '../../../env';
import { ExpressRequest, ExpressResponse } from '../../../config/http/type';
import { ExpressValidationError } from '../../../config/http/error/validation';
import { ProposalStationEntity } from '../../../domains/core/proposal-station/entity';
import { ProposalEntity } from '../../../domains/core/proposal/entity';
import { StationEntity } from '../../../domains/core/station/entity';

export async function getManyRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    // tslint:disable-next-line:prefer-const
    const { filter, page, include } = req.query;

    const repository = getRepository(ProposalStationEntity);
    const query = await repository.createQueryBuilder('proposalStation');

    onlyRealmPermittedQueryResources(query, req.realmId, [
        'proposalStation.station_realm_id',
        'proposalStation.proposal_realm_id',
    ]);

    const relations = applyRelations(query, include, {
        allowed: ['station', 'proposal'],
        defaultAlias: 'proposalStation',
    });

    applyFilters(query, filter, {
        relations,
        allowed: [
            'proposal_id',
            'proposal.id',
            'proposal.title',

            'station_id',
            'station.name',
            'station.realm_id',
        ],
        defaultAlias: 'proposalStation',
    });

    const pagination = applyPagination(query, page, { maxLimit: 50 });

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

export async function getRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;
    const { include } = req.query;

    const repository = getRepository(ProposalStationEntity);
    const query = repository.createQueryBuilder('proposalStation')
        .where('proposalStation.id = :id', { id });

    applyRelations(query, include, {
        allowed: ['station', 'proposal'],
        defaultAlias: 'proposalStation',
    });

    const entity = await query.getOne();

    if (typeof entity === 'undefined') {
        throw new NotFoundError();
    }

    if (
        !isPermittedForResourceRealm(req.realmId, entity.station_realm_id) &&
        !isPermittedForResourceRealm(req.realmId, entity.proposal_realm_id)
    ) {
        throw new ForbiddenError();
    }

    return res.respond({ data: entity });
}

export async function addRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    await check('proposal_id')
        .exists()
        .isInt()
        .run(req);

    await check('station_id')
        .exists()
        .isInt()
        .run(req);

    if (
        !req.ability.hasPermission(PermissionID.PROPOSAL_EDIT) &&
        !req.ability.hasPermission(PermissionID.PROPOSAL_ADD)
    ) {
        throw new ForbiddenError('You are not allowed to add a proposal station.');
    }

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
        throw new ExpressValidationError(validation);
    }

    const data : Partial<ProposalStationEntity> = matchedData(req, { includeOptionals: false });

    // proposal
    const proposalRepository = getRepository(ProposalEntity);
    const proposal = await proposalRepository.findOne(data.proposal_id);

    if (typeof proposal === 'undefined') {
        throw new NotFoundError('The referenced proposal was not found.');
    }

    data.proposal_realm_id = proposal.realm_id;

    if (!isPermittedForResourceRealm(req.realmId, proposal.realm_id)) {
        throw new ForbiddenError();
    }

    // station
    const stationRepository = getRepository(StationEntity);
    const station = await stationRepository.findOne(data.station_id);

    if (typeof station === 'undefined') {
        throw new NotFoundError('The referenced station was not found.');
    }

    data.station_realm_id = station.realm_id;

    const repository = getRepository(ProposalStationEntity);
    let entity = repository.create(data);

    if (env.skipProposalApprovalOperation) {
        entity.approval_status = ProposalStationApprovalStatus.APPROVED;
    }

    entity = await repository.save(entity);

    await emitDispatcherProposalEvent({
        event: DispatcherProposalEvent.ASSIGNED,
        id: entity.proposal_id,
        stationId: entity.station_id,
        operatorRealmId: req.realmId,
    });

    return res.respondCreated({
        data: entity,
    });
}

export async function editRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    if (typeof id !== 'string') {
        throw new BadRequestError('The proposal-station id is not valid.');
    }

    const repository = getRepository(ProposalStationEntity);
    let proposalStation = await repository.findOne(id);

    if (typeof proposalStation === 'undefined') {
        throw new NotFoundError();
    }

    const isAuthorityOfStation = isPermittedForResourceRealm(req.realmId, proposalStation.station_realm_id);
    const isAuthorizedForStation = req.ability.hasPermission(PermissionID.PROPOSAL_APPROVE);

    const isAuthorityOfProposal = isPermittedForResourceRealm(req.realmId, proposalStation.proposal_realm_id);
    const isAuthorizedForProposal = req.ability.hasPermission(PermissionID.PROPOSAL_EDIT);

    if (
        !(isAuthorityOfStation && isAuthorizedForStation) &&
        !(isAuthorityOfProposal && isAuthorizedForProposal)
    ) {
        throw new ForbiddenError();
    }

    if (isAuthorityOfStation) {
        await check('approval_status')
            .optional()
            .custom((command) => isProposalStationApprovalStatus(command))
            .run(req);

        await check('comment')
            .optional({ nullable: true })
            .isString()
            .run(req);
    }

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
        throw new ExpressValidationError(validation);
    }

    const data = matchedData(req, { includeOptionals: false });

    const entityStatus : string | undefined = proposalStation.approval_status;

    proposalStation = repository.merge(proposalStation, data);

    proposalStation = await repository.save(proposalStation);

    if (
        data.approval_status &&
        data.approval_status !== entityStatus &&
        Object.values(ProposalStationApprovalStatus).includes(data.approval_status)
    ) {
        await emitDispatcherProposalEvent({
            event: proposalStation.approval_status as unknown as DispatcherProposalEvent,
            id: proposalStation.proposal_id,
            stationId: proposalStation.station_id,
            operatorRealmId: req.realmId,
        });
    }

    return res.respondCreated({
        data: proposalStation,
    });
}

export async function dropRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    if (
        !req.ability.hasPermission(PermissionID.PROPOSAL_EDIT) &&
        !req.ability.hasPermission(PermissionID.PROPOSAL_ADD)
    ) {
        throw new ForbiddenError('You are not allowed to drop a proposal station.');
    }

    const repository = getRepository(ProposalStationEntity);

    const entity : ProposalStationEntity | undefined = await repository.findOne(id);

    if (typeof entity === 'undefined') {
        throw new NotFoundError();
    }

    if (
        !isPermittedForResourceRealm(req.realmId, entity.station_realm_id) &&
        !isPermittedForResourceRealm(req.realmId, entity.proposal_realm_id)
    ) {
        throw new ForbiddenError('You are not authorized to drop this proposal station.');
    }

    await repository.remove(entity);

    return res.respondDeleted({ data: entity });
}

type PartialProposalStation = Partial<ProposalStation>;

@SwaggerTags('pht')
@Controller('/proposal-stations')
export class ProposalStationController {
    @Get('', [ForceLoggedInMiddleware])
    async getMany(
        @Request() req: any,
            @Response() res: any,
    ): Promise<PartialProposalStation[]> {
        return getManyRouteHandler(req, res);
    }

    @Post('', [ForceLoggedInMiddleware])
    async add(
        @Body() data: Pick<ProposalStation, 'station_id' | 'proposal_id'>,
            @Request() req: any,
            @Response() res: any,
    ): Promise<PartialProposalStation | undefined> {
        return addRouteHandler(req, res);
    }

    @Get('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @Params('id') id: string,
            @Request() req: any,
            @Response() res: any,
    ): Promise<PartialProposalStation | undefined> {
        return getRouteHandler(req, res);
    }

    @Post('/:id', [ForceLoggedInMiddleware])
    async edit(
        @Params('id') id: string,
            @Body() data: Pick<ProposalStation, 'station_id' | 'proposal_id' | 'comment' | 'approval_status'>,
            @Request() req: any,
            @Response() res: any,
    ): Promise<PartialProposalStation | undefined> {
        return editRouteHandler(req, res);
    }

    @Delete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @Params('id') id: string,
            @Request() req: any,
            @Response() res: any,
    ): Promise<PartialProposalStation | undefined> {
        return dropRouteHandler(req, res);
    }
}
