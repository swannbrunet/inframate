import {InstanceSize} from "./instanceSize.type.ts";
import type {Service} from "./service.type.ts";

export type Plugin = TypesenseConfigPlugin | MongoDBConfigPlugin | KeycloakConfigPlugin | PostgresConfigPlugin;

export interface PluginAbstract {
    kind: string,
    prodDedicated: boolean, // if is true a dedicated instance is created for prod stack. Default dedicated.
    reviewDedicated: boolean, // if is true a dedicated instance is created for other stack that prod. Default Shared.
}

export interface TypesenseConfigPlugin extends PluginAbstract {
    kind: 'typesense',
    clusterName: string,
    size: InstanceSize,
}

export interface MongoDBConfigPlugin extends PluginAbstract {
    kind : 'mongoDB',
    clusterName: string,
    size: InstanceSize,
}

export interface KeycloakConfigPlugin extends PluginAbstract {
    kind: 'keycloak',
    clusterName: string,
    size: InstanceSize,
    externalDomainPrefix: string,
}

export interface PostgresConfigPlugin extends PluginAbstract {
    kind: 'postgres',
    clusterName: string,
}

export interface AppConfigPlugin extends Service {
    kind: 'app',
}
