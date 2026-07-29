import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { affectedResources, resourceFromUrl } from './liveData';

interface CacheEntry {
    response: AxiosResponse;
    resources: string[];
}

const responseCache = new Map<string, CacheEntry>();
const pendingRequests = new Map<string, Promise<AxiosResponse>>();
const resourceGenerations = new Map<string, number>();
let globalGeneration = 0;

const stableValue = (value: unknown): string => {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableValue).join(',')}]`;

    return `{${Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => `${JSON.stringify(key)}:${stableValue(item)}`)
        .join(',')}}`;
};

const cacheKey = (config: InternalAxiosRequestConfig) => {
    const authorization = String(config.headers?.Authorization ?? '');
    return [
        authorization,
        config.baseURL ?? '',
        config.url ?? '',
        stableValue(config.params ?? {}),
    ].join('|');
};

const resourcesForRequest = (url?: string) => {
    const resource = resourceFromUrl(url);
    return resource ? [resource] : [];
};

const canCache = (config: InternalAxiosRequestConfig) => {
    const method = config.method?.toLowerCase() ?? 'get';
    const url = config.url ?? '';
    const responseType = config.responseType ?? 'json';

    return method === 'get'
        && !url.includes('/data-versions')
        && ['json', 'text'].includes(responseType);
};

export const createCachedAdapter = (networkAdapter: AxiosAdapter): AxiosAdapter => {
    return async (config) => {
        if (!canCache(config)) return networkAdapter(config);

        const key = cacheKey(config);
        const cached = responseCache.get(key);
        if (cached) {
            return {
                ...cached.response,
                config,
                request: undefined,
            };
        }

        const pending = pendingRequests.get(key);
        if (pending) {
            const response = await pending;
            return { ...response, config };
        }

        const requestResources = resourcesForRequest(config.url);
        const requestGlobalGeneration = globalGeneration;
        const requestResourceGenerations = new Map(
            requestResources.map(resource => [resource, resourceGenerations.get(resource) ?? 0]),
        );

        const request: Promise<AxiosResponse> = networkAdapter(config)
            .then(response => {
                const isStillCurrent = requestGlobalGeneration === globalGeneration
                    && requestResources.every(resource =>
                        requestResourceGenerations.get(resource) === (resourceGenerations.get(resource) ?? 0)
                    );

                if (response.status >= 200 && response.status < 300 && isStillCurrent) {
                    responseCache.set(key, {
                        response,
                        resources: requestResources,
                    });
                }
                return response;
            })
            .finally(() => {
                if (pendingRequests.get(key) === request) pendingRequests.delete(key);
            });

        pendingRequests.set(key, request);
        return request;
    };
};

export const invalidateApiCache = (resources?: string | string[]) => {
    if (!resources) {
        globalGeneration += 1;
        responseCache.clear();
        pendingRequests.clear();
        return;
    }

    const targets = new Set(Array.isArray(resources) ? resources : [resources]);
    targets.forEach(resource => {
        resourceGenerations.set(resource, (resourceGenerations.get(resource) ?? 0) + 1);
    });

    for (const [key, entry] of responseCache.entries()) {
        if (entry.resources.some(resource => targets.has(resource))) {
            responseCache.delete(key);
        }
    }
};

export const invalidateApiCacheForUrl = (url?: string) => {
    invalidateApiCache(affectedResources(resourceFromUrl(url)));
};
