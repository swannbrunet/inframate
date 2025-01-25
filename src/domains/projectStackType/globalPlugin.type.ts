
export type GlobalPluginConfig = KeycloakBackendPlugin

interface PluginAbstract {
    kind: string,
    prodDedicated: boolean, // if is true a dedicated instance is created for prod stack. Default dedicated.
    reviewDedicated: boolean, // if is true a dedicated instance is created for other stack that prod. Default Shared.
}

export interface TypesensePlugin extends PluginAbstract {
    kind: 'typesense'
    exportedEnvMapping: {
        host: string,
        port: string,
        protocol: string,
    }
}

export interface MongoDBPlugin extends PluginAbstract {
    kind : 'mongoDB',
    databaseName: string,
    right: 'r' | 'w' | 'rw'
    exportedEnvMapping : {
        uri: string,
    }
}

export interface KeycloakBackendPlugin extends PluginAbstract {
    kind: 'keycloak-backend',
    realmName: string,
    exportedEnvMapping : {
        realmName: string,
        userName: string,
        password: string,
        clientId: string,
    }
}

export interface KeycloakFrontendPrivatePlugin extends PluginAbstract {
    kind: 'keycloak-frontend-private',
    realmName: string,
    exportedEnvMapping : {
        clientId: string,
        clientSecret: string,
        issuer: string,
    }
}

export interface KeycloakFrontendPublicPlugin extends PluginAbstract {
    kind: 'keycloak-frontend-public',
    realmName: string,
    exportedEnvMapping : {
        clientId: string,
        issuer: string,
    }
}

export interface PostgreSQLPlugin extends PluginAbstract {
    kind: 'postgreSQL',
    databaseName: string,
    right: 'r' | 'w' | 'rw'
    exportedEnvMapping : {
        uri: string,
    }
}