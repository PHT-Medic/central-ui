import {verifyToken} from "../../../auth/utils/token";
import {PermissionInterface} from "../../../auth";
import {getCustomRepository} from "typeorm";
import {UserRepository} from "../../../../domains/user/repository";
import {User} from "../../../../domains/user";
import UserAbility from "../../../auth/utils/user-ability";
import {parseHarborConnectionString} from "../../../api/provider/harbor";
import env from "../../../../env";
import {Middleware} from "@decorators/express";
import {Request, Response, NextFunction} from "express";

const harborConfig = parseHarborConnectionString(env.harborConnectionString);

function parseAsServiceToken(token: string) : {id: string} {
    if(harborConfig.token === token) {
        return {
            id: 'harbor'
        }
    }

    throw new Error('Es konnte kein Dienst zu dem Token assoziert werden.');
}

async function parseAsUserToken(token: string) : Promise<{
    user: User,
    permissions: PermissionInterface[],
    remoteAddress: string
}> {
    const tokenInfo = await verifyToken(token);

    const userId: number | undefined = tokenInfo.id;
    const remoteAddress : string = tokenInfo.remoteAddress;

    if(typeof userId !== 'number') {
        throw new Error('Es konnte kein Benutzer zu dem Token assoziert werden.');
    }

    const userRepository = getCustomRepository<UserRepository>(UserRepository);
    const user = await userRepository.findOne(userId, {relations: ['realm']});

    if(typeof user === 'undefined') {
        throw new Error('Der Benutzer existiert nicht mehr.');
    }

    return {
        user,
        remoteAddress,
        permissions: await userRepository.findPermissions(user.id)
    };
}

export async function checkAuthenticated(req: any, res: any, next: any) {
    let { authorization } = req.headers;

    try {
        let token : Record<string, any> | null | undefined = req.cookies?.auth_token ? JSON.parse(req.cookies?.auth_token) : undefined;

        if(token) {
            authorization = "Bearer " + token.accessToken;
        }
    } catch (e) {
    }

    if(typeof authorization === "string") {
        const parts : string[] = authorization.split(" ");

        if(parts.length < 2) {
            return res._failUnauthorized({message: 'Der angegebene Token ist in keinem gültigen Format.', code: 'invalid_token'});
        }

        req.token = parts[1];

        let parsed : boolean = false;
        let parseError : string | undefined;

        try {
            req.service = parseAsServiceToken(req.token);
            req.serviceId = req.service.id;
            parsed = true;
        } catch (e) {
            parseError = e.message;
        }

        try {
            const {user, remoteAddress, permissions} = await parseAsUserToken(req.token);

            const newAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

            // todo: whitelist for train builder other services and localhost.
            if(remoteAddress !== newAddress) {
                //return res._failUnauthorized({message: 'The ip address changed...', code: 'invalid_ip'});
            }

            req.user = user;
            req.permissions = permissions;
            req.userId = req.user.id;

            req.ability = new UserAbility(permissions);

            parsed = true;
        } catch (e) {
            res.cookie('auth_token', null, {maxAge: Date.now()});
            parseError = e.message;
        }

        if(!parsed) {
            return res._failUnauthorized({message: parseError, code: 'invalid_token'});
        }
    }

    next();
}

export function forceLoggedIn(req: any, res: any, next: any) {
    if(typeof req.userId === 'undefined' && typeof req.serviceId === 'undefined') {
        res._failUnauthorized({message: 'Sie müssen angemeldet sein.'});
        return;
    }

    next();
}

export class ForceLoggedInMiddleware implements Middleware {
    public use(request: Request, response: Response, next: NextFunction) {
        return forceLoggedIn(request, response, next);
    }
}
