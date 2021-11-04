/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {LayoutNavigationID} from "@/modules/layout/contants";

export interface LayoutComponentBase {
    name: string,
    url?: string,
    icon?: string,
    environment?: 'development' | 'production' | 'testing',
    requireLoggedIn?: boolean,
    requirePermissions?: string[],
    requireLoggedOut?: boolean,

}

export interface LayoutNavigationComponent extends LayoutComponentBase {
    id: string,
    components?: LayoutNavigationComponent[]
}

export type LayoutSidebarComponentType = 'link' | 'separator';
export interface LayoutSidebarComponent extends LayoutComponentBase {
    type: LayoutSidebarComponentType,
    rootLink?: boolean,
    components?: LayoutSidebarComponent[]
}

export type LayoutComponent = LayoutNavigationComponent | LayoutSidebarComponent;
export type LayoutNavigationIDType = `${LayoutNavigationID}`;
