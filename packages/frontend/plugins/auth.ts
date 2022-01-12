/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Context } from '@nuxt/types';
import { Inject } from '@nuxt/types/app';

import AuthModule from '~/modules/auth';

declare module '@nuxt/types' {
    // nuxtContext.$myInjectedFunction
    // eslint-disable-next-line no-unused-vars
    interface Context {
        $auth: AuthModule
    }
}

declare module 'vuex/types/index' {
    // this.$myInjectedFunction inside Vuex stores
    // eslint-disable-next-line no-unused-vars
    interface Store<S> {
        $auth: AuthModule
    }
}

export default (context: Context, inject: Inject) => {
    const auth = new AuthModule(context, {
        tokenHost: context.$config.apiUrl,
        tokenPath: 'token',
        userInfoPath: 'token',
    });

    inject('auth', auth);
};
