import {getRepository} from "typeorm";
import {MasterImage} from "../../../../domains/pht/master-image";
import {applyRequestFilterOnQuery} from "../../../../db/utils/filter";

import {Body, Controller, Delete, Get, Params, Post, Request, Response} from "@decorators/express";
import {ForceLoggedInMiddleware} from "../../../../modules/http/request/middleware/authMiddleware";
import {ResponseExample, SwaggerTags} from "typescript-swagger";

@SwaggerTags('pht')
@Controller("/master-images")
export class MasterImageController {
    @Get("",[ForceLoggedInMiddleware])
    @ResponseExample<Array<MasterImage>>([
        {name: 'slim', external_tag_id: 'slim', id: 1, proposals: [], trains: []},
        {name: 'buster', external_tag_id: 'buster', id: 1, proposals: [], trains: []}
    ])
    async getMany(
        @Request() req: any,
        @Response() res: any
    ): Promise<Array<MasterImage>> {
        return await getMasterImagesRouteHandler(req, res) as Array<MasterImage>;
    }

    @Get("/:id",[ForceLoggedInMiddleware])
    @ResponseExample<MasterImage>({name: 'slim', external_tag_id: 'slim', id: 1, proposals: [], trains: []})
    async getOne(
        @Params('id') id: string,
        @Request() req: any,
        @Response() res: any
    ): Promise<MasterImage|undefined> {
        return await getMasterImageRouteHandler(req, res) as MasterImage | undefined;
    }

    @Post("/:id",[ForceLoggedInMiddleware])
    @ResponseExample<MasterImage>({name: 'slim', external_tag_id: 'slim', id: 1, proposals: [], trains: []})
    async update(
        @Params('id') id: string,
        @Body() data: MasterImage,
        @Request() req: any,
        @Response() res: any
    ): Promise<MasterImage|undefined> {
        return res._failServerError({message: 'Not implemented yet'}) as  | undefined;
    }

    @Post("",[ForceLoggedInMiddleware])
    @ResponseExample<MasterImage>({name: 'slim', external_tag_id: 'slim', id: 1, proposals: [], trains: []})
    async add(
        @Body() data: MasterImage,
        @Request() req: any,
        @Response() res: any
    ): Promise<MasterImage|undefined> {
        return res._failServerError({message: 'Not implemented yet'}) as  | undefined;
    }

    @Delete("/:id",[ForceLoggedInMiddleware])
    @ResponseExample<MasterImage>({name: 'slim', external_tag_id: 'slim', id: 1, proposals: [], trains: []})
    async drop(
        @Params('id') id: string,
        @Request() req: any,
        @Response() res: any
    ): Promise<MasterImage|undefined> {
        return res._failServerError({message: 'Not implemented yet'}) as MasterImage;
    }
}

export async function getMasterImageRouteHandler(req: any, res: any) {
    const { id } = req.params;

    const repository = getRepository(MasterImage);

    const entity = await repository.findOne(id);

    if(typeof entity === 'undefined') {
        return res._failNotFound();
    }

    return res._respond({data: entity})
}

export async function getMasterImagesRouteHandler(req: any, res: any) {
    let { filter } = req.query;

    const repository = getRepository(MasterImage);
    const query = repository.createQueryBuilder('image');

    applyRequestFilterOnQuery(query, filter, {
        id: 'image.id',
        name: 'image.name'
    });

    const entity = await query.getMany();

    if(typeof entity === 'undefined') {
        return res._failNotFound();
    }

    return res._respond({data: entity})
}
