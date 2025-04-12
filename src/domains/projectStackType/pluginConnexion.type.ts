
export type Plugin = TypesenseConnexion | MongoDBConnexion | KeycloakServiceAccountConnexion | KeycloakFrontendPrivateConnexion | KeycloakFrontendPublicConnexion | PostgresConnexion | ServiceConnexion

interface PluginAbstract {
    kind: string,
    exportedEnvMapping: {},
    clusterName?: string
}

export interface TypesenseConnexion extends PluginAbstract {
    kind: 'typesense'
    clusterName: string,
    right: 'r' | 'w' | 'rw'
    exportedEnvMapping: {
        host: string,
        port: string,
        protocol: string,
        apiKey: string
    }
}

export interface MongoDBConnexion extends PluginAbstract {
    kind : 'mongoDB',
    clusterName: string,
    databaseName: string,
    right: 'r' | 'w' | 'rw'
    exportedEnvMapping : {
        uri: string,
    }
}

export type KeycloakConnexion = KeycloakServiceAccountConnexion | KeycloakFrontendPrivateConnexion | KeycloakFrontendPublicConnexion;

export interface KeycloakServiceAccountConnexion extends PluginAbstract {
    kind: 'keycloak-service-account',
    clusterName: string,
    realmName: string,
    clientName: string,
    exportedEnvMapping : {
        realmName: string,
        clientSecret: string,
        clientId: string,
        url: string,
    }
}

export interface KeycloakFrontendPrivateConnexion extends PluginAbstract {
    kind: 'keycloak-frontend-private',
    clusterName: string,
    realmName: string,
    clientName: string,
    exportedEnvMapping : {
        clientId: string,
        clientSecret: string,
        issuer: string,
    }
}

export interface KeycloakFrontendPublicConnexion extends PluginAbstract {
    kind: 'keycloak-frontend-public',
    clusterName: string,
    realmName: string,
    clientName: string,
    exportedEnvMapping : {
        clientId: string,
        issuer: string,
    }
}

export interface PostgresConnexion extends PluginAbstract {
    kind: 'postgres',
    clusterName: string,
    databaseName: string,
    right: 'r' | 'w' | 'rw'
    exportedEnvMapping : {
        uri?: string,
        host?: string,
        username?: string,
        password?: string,
        database?: string
        port?: string
    }
}

export interface ServiceConnexion extends PluginAbstract {
    kind: 'serviceConnexion',
    serviceName: string,
    mode: 'public' | 'private'
    templateUrl?: string,
    exportEnvMapping : {
        url: string
    }
}
