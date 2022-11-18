import type { Api } from '@jellyfin/sdk';
import type { UserDto } from '@jellyfin/sdk/lib/generated-client';
import { ApiClient } from 'jellyfin-apiclient';
import React, { createContext, FC, useContext, useEffect, useState } from 'react';

import type ServerConnections from '../components/ServerConnections';
import events from '../utils/events';
import { toApi } from '../utils/jellyfin-apiclient/compat';

interface ApiProviderProps {
    connections: typeof ServerConnections
}

interface JellyfinApiContext {
    __legacyApiClient__?: ApiClient
    api?: Api
    user?: UserDto
}

export const ApiContext = createContext<JellyfinApiContext>({});
export const useApi = () => useContext(ApiContext);

export const ApiProvider: FC<ApiProviderProps> = ({ connections, children }) => {
    const [ legacyApiClient, setLegacyApiClient ] = useState<ApiClient>();
    const [ api, setApi ] = useState<Api>();
    const [ user, setUser ] = useState<UserDto>();

    useEffect(() => {
        connections.currentApiClient()
            .getCurrentUser()
            .then(newUser => udpateApiUser(null, newUser))
            .catch(err => {
                console.warn('[ApiProvider] Could not get current user', err);
            });

        const udpateApiUser = (_e: any, newUser: UserDto) => {
            setUser(newUser);

            if (newUser.ServerId) {
                setLegacyApiClient(connections.getApiClient(newUser.ServerId));
            }
        };

        const resetApiUser = () => {
            setLegacyApiClient(undefined);
            setUser(undefined);
        };

        events.on(connections, 'localusersignedin', udpateApiUser);
        events.on(connections, 'localusersignedout', resetApiUser);

        return () => {
            events.off(connections, 'localusersignedin', udpateApiUser);
            events.off(connections, 'localusersignedout', resetApiUser);
        };
    }, [ connections, setLegacyApiClient, setUser ]);

    useEffect(() => {
        setApi(legacyApiClient ? toApi(legacyApiClient) : undefined);
    }, [ legacyApiClient, setApi ]);

    return (
        <ApiContext.Provider value={{
            __legacyApiClient__: legacyApiClient,
            api,
            user
        }}>
            {children}
        </ApiContext.Provider>
    );
};
