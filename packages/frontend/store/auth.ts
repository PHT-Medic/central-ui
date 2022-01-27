/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Vue from 'vue';
import { ActionTree, GetterTree, MutationTree } from 'vuex';

import {
    OAuth2TokenKind, PermissionItem, User,
} from '@typescript-auth/domains';
import { RootState } from './index';
import { AuthBrowserStorageKey } from '@/modules/auth/constants';

export interface AuthState {
    user: User | undefined,

    permissions: PermissionItem[],
    permissionsResolved: boolean,

    accessToken: string | undefined,
    accessTokenExpireDate: Date | undefined,
    refreshToken: string | undefined,

    tokenPromise: Promise<any> | undefined,

    required: boolean,
    inProgress: boolean,
    error: undefined | { code: string, message: string },
}
const state = () : AuthState => ({
    user: undefined,

    permissions: [],
    permissionsResolved: false,

    accessToken: undefined,
    accessTokenExpireDate: undefined,
    refreshToken: undefined,

    tokenPromise: undefined,

    required: false,
    inProgress: false,
    error: undefined,
});

export const getters : GetterTree<AuthState, RootState> = {
    user: (state: AuthState) => state.user,
    userId: (state: AuthState) => (state.user ? state.user.id : undefined),
    userRealmId: (state: AuthState) => (state.user ? state.user.realm_id : undefined),
    permissions: (state: AuthState) => state.permissions,
    permissionsResolved: (state: AuthState) => state.permissionsResolved,
    permission: (state: AuthState) => (id: number | string) => {
        const items = state.permissions.filter((item: Record<string, any>) => {
            if (typeof id === 'number') {
                return item.id === id;
            }
            return item.name === id;
        });

        return items.length === 1 ? items[0] : undefined;
    },
    loggedIn: (state : AuthState) => !!state.accessToken,

    accessToken: (state: AuthState) => state.accessToken,
    accessTokenExpireDate: (state: AuthState) => state.accessTokenExpireDate,
    refreshToken: (state: AuthState) => state.refreshToken,
};

export const actions : ActionTree<AuthState, RootState> = {
    // --------------------------------------------------------------------

    triggerSetLoginRequired({ commit }, required: boolean) {
        commit('setLoginRequired', required);
    },

    // --------------------------------------------------------------------

    triggerSetToken({ commit }, { kind, token }) {
        switch (kind) {
            case OAuth2TokenKind.ACCESS:
                this.$authWarehouse.set(AuthBrowserStorageKey.ACCESS_TOKEN, token);
                this.$auth.setRequestToken(token);
                break;
            case OAuth2TokenKind.REFRESH:
                this.$authWarehouse.set(AuthBrowserStorageKey.REFRESH_TOKEN, token);
                break;
        }

        commit('setToken', { kind, token });
    },
    triggerUnsetToken({ commit }, kind) {
        switch (kind) {
            case OAuth2TokenKind.ACCESS:
                this.$authWarehouse.remove(AuthBrowserStorageKey.ACCESS_TOKEN);
                this.$auth.unsetRequestToken();
                break;
            case OAuth2TokenKind.REFRESH:
                this.$authWarehouse.remove(AuthBrowserStorageKey.REFRESH_TOKEN);
                break;
        }

        commit('unsetToken', kind);
    },

    // --------------------------------------------------------------------

    triggerSetUser({ commit }, user) {
        this.$authWarehouse.set(AuthBrowserStorageKey.USER, user);
        commit('setUser', user);
    },
    triggerUnsetUser({ commit }) {
        this.$authWarehouse.remove(AuthBrowserStorageKey.USER);
        commit('unsetUser');
    },

    // --------------------------------------------------------------------

    triggerSetPermissions({ commit }, permissions) {
        this.$authWarehouse.setLocalStorageItem(AuthBrowserStorageKey.PERMISSIONS, permissions);
        commit('setPermissions', permissions);
    },
    triggerUnsetPermissions({ commit }) {
        this.$authWarehouse.removeLocalStorageItem(AuthBrowserStorageKey.PERMISSIONS);
        commit('unsetPermissions');
    },

    // --------------------------------------------------------------------

    /**
     * Try to trigger user refresh.
     *
     * @param state
     * @param dispatch
     *
     * @returns {Promise<boolean>}
     */
    async triggerRefreshMe({ state, dispatch }) {
        const { accessToken } = state;

        if (accessToken) {
            try {
                const { permissions, ...user } = await this.$auth.getUserInfo(accessToken);

                dispatch('triggerUnsetUser');

                dispatch('triggerSetUser', user);
                dispatch('triggerSetPermissions', permissions);
            } catch (e) {
                dispatch('triggerLogout');
                throw e;
            }
        }
    },
    // --------------------------------------------------------------------

    /**
     * Try to login the user with given credentials.
     *
     * @return {Promise<boolean>}
     */
    async triggerLogin({ commit, dispatch }, { name, password }: {name: string, password: string}) {
        commit('loginRequest');

        try {
            const token = await this.$auth.getTokenWithPassword(name, password);

            commit('loginSuccess');
            commit('setTokenExpireDate', { kind: OAuth2TokenKind.ACCESS, date: new Date(Date.now() + token.expires_in * 1000) });

            dispatch('triggerSetToken', { kind: OAuth2TokenKind.ACCESS, token: token.access_token });
            dispatch('triggerSetToken', { kind: OAuth2TokenKind.REFRESH, token: token.refresh_token });

            await dispatch('triggerRefreshMe');
            await dispatch('layout/initNavigation', undefined, { root: true });
        } catch (e) {
            await dispatch('triggerUnsetToken', OAuth2TokenKind.ACCESS);
            await dispatch('triggerUnsetToken', OAuth2TokenKind.REFRESH);

            throw e;
        }
    },

    // --------------------------------------------------------------------

    triggerRefreshToken({ commit, state, dispatch }) {
        if (
            typeof state.refreshToken !== 'string'
        ) {
            throw new Error('It is not possible to receive a new access token');
        }

        if (!state.tokenPromise) {
            commit('loginRequest');

            try {
                const p = this.$auth.getTokenWithRefreshToken(state.refreshToken);

                commit('setTokenPromise', p);

                p.then(
                    (token) => {
                        commit('setTokenPromise', null);
                        commit('loginSuccess');

                        commit('setTokenExpireDate', { kind: OAuth2TokenKind.ACCESS, date: new Date(Date.now() + token.expires_in * 1000) });

                        dispatch('triggerSetToken', { kind: OAuth2TokenKind.ACCESS, token: token.access_token });
                        dispatch('triggerSetToken', { kind: OAuth2TokenKind.REFRESH, token: token.refresh_token });

                        dispatch('triggerRefreshMe');
                    },
                    () => {
                        commit('setTokenPromise', null);
                    },
                );
            } catch (e) {
                commit('setTokenPromise', null);
                if (e instanceof Error) {
                    dispatch('triggerAuthError', e.message);
                }

                throw new Error('An error occurred on the token refresh request.');
            }
        }

        return state.tokenPromise;
    },

    // --------------------------------------------------------------------

    async triggerTokenExpired({ dispatch }) {
        try {
            await dispatch('triggerRefreshToken');
        } catch (e) {
            dispatch('triggerSetLoginRequired', true);

            throw e;
        }
    },

    // --------------------------------------------------------------------

    /**
     * Try to logout the user.
     * @param commit
     */
    async triggerLogout({ dispatch }) {
        await dispatch('triggerUnsetToken', OAuth2TokenKind.ACCESS);
        await dispatch('triggerUnsetToken', OAuth2TokenKind.REFRESH);
        await dispatch('triggerUnsetUser');
        await dispatch('triggerUnsetPermissions');

        await dispatch('triggerSetLoginRequired', false);

        await dispatch('layout/initNavigation', undefined, { root: true });
    },

    // --------------------------------------------------------------------

    /**
     * Trigger custom authentication error by
     * another service or component.
     *
     * @param commit
     * @param message
     */
    triggerAuthError({ commit }, message) {
        commit('loginError', { errorCode: 'internal', errorMessage: message });
    },

    //--------------------------------------------------------

    /**
     * Trigger user property change.
     *
     * @param commit
     * @param state
     * @param property
     * @param value
     */
    triggerSetUserProperty({ commit, state }, { property, value }) {
        commit('setUserProperty', { property, value });
        this.$authWarehouse.remove(AuthBrowserStorageKey.USER);
        this.$authWarehouse.set(AuthBrowserStorageKey.USER, state.user);
    },
};

export const mutations : MutationTree<AuthState> = {
    // Login mutations
    loginRequest(state) {
        state.inProgress = true;

        state.error = undefined;
    },
    loginSuccess(state) {
        state.inProgress = false;
        state.required = false;
    },
    loginError(state, { errorCode, errorMessage }) {
        state.inProgress = false;

        state.error = {
            code: errorCode,
            message: errorMessage,
        };
    },
    setLoginRequired(state, required) {
        state.required = required;
    },

    // --------------------------------------------------------------------

    setTokenPromise(state, promise) {
        state.tokenPromise = promise;
    },

    // --------------------------------------------------------------------

    setUser(state, user) {
        state.user = user;
    },
    unsetUser(state) {
        state.user = undefined;
    },

    // --------------------------------------------------------------------

    setUserProperty(state, { property, value }) {
        if (typeof state.user === 'undefined') return;

        Vue.set(state.user, property, value);
    },

    // --------------------------------------------------------------------

    setPermissions(state, permissions) {
        state.permissions = permissions;
    },
    unsetPermissions(state) {
        state.permissions = [];
    },

    setPermissionsResolved(state, resolved) {
        state.permissionsResolved = !!resolved;
    },

    // --------------------------------------------------------------------
    setToken(state, { kind, token }) {
        switch (kind) {
            case OAuth2TokenKind.ACCESS:
                state.accessToken = token;
                break;
            case OAuth2TokenKind.REFRESH:
                state.refreshToken = token;
                break;
        }
    },
    unsetToken(state, kind) {
        switch (kind) {
            case OAuth2TokenKind.ACCESS:
                state.accessToken = undefined;
                break;
            case OAuth2TokenKind.REFRESH:
                state.refreshToken = undefined;
                break;
        }
    },
    setTokenExpireDate(state, { kind, date }) {
        switch (kind) {
            case OAuth2TokenKind.ACCESS:
                state.accessTokenExpireDate = date;
                break;
        }
    },
};

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations,
};
