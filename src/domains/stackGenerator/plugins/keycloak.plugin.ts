import * as Docker from "@pulumi/docker"
import * as Keycloak from "@pulumi/keycloak"
import Pulumi from '@pulumi/pulumi';
import { Provider as DockerProvider } from "@pulumi/docker"
import { secretManager } from "../../secretManager/index.js"
import { ConfigDeployement, ResourceToDeploy } from "../config.type.js"
import { PostgresPlugin } from "./postgres.plugin.js"
import { KeycloakBackendPlugin, KeycloakFrontendPrivatePlugin, KeycloakFrontendPublicPlugin } from "../../projectStackType/plugin.type.js";
import { setPluginReturn } from "./index.js";

interface DockerInstance {
    username: string,
    password: string,
    realm: string,
    clientId: string,
    url: string
}

export class KeycloakPlugin {
    constructor(private dockerProvider: DockerProvider, private secretManager: secretManager, private postgresPlugin: PostgresPlugin, private config: ConfigDeployement) {}

    private getKeycloakKey(): string {
        return `${this.config.stackName}-${this.config.projectName}-plugin-postgres`
    }

    private getKeycloakUri(): string {
        return `auth.${this.config.domain}`
    }

    private getKeycloakNetwork(config: ConfigDeployement, resource: ResourceToDeploy): Docker.Network {
        const key = `${this.getKeycloakKey()}-network`
        if(resource[key]) {
            return resource[key] as Docker.Network
        }

        const network = new Docker.Network(key, {
            name: key,
            internal: true
        }, {provider: this.dockerProvider})

        resource[key] = network

        return network
    }

    private async getInstance(key: string, resource: ResourceToDeploy, config: ConfigDeployement): Promise<DockerInstance> {
        const username = await this.secretManager.getOrCreateSecret(`${key}-user`)
        const password = await this.secretManager.getOrCreateSecret(`${key}-password`)
        const clientId = 'admin-cli'
        const realm = 'master'
        const uri = this.getKeycloakUri()
        if(!resource[key]) {
        const keycloakDatabaseName = "postgres"

        const postgresConnexion = await this.postgresPlugin.getConnexion(config, keycloakDatabaseName, resource)
        const traefikNetwork = resource['global-traefik-network'] as Docker.Network 

        const keycloakImage = new Docker.RemoteImage("keycloak", {
            name: `docker.io/bitnami/keycloak:22.0.3`,
          }, {
            provider: this.dockerProvider
          })

        const network = this.getKeycloakNetwork(config, resource)

        const instance = new Docker.Container(key, {
            image: keycloakImage.imageId,
            name: key,
            restart: 'always',
            envs: [
                'KEYCLOAK_CREATE_ADMIN_USER=true',
                'KEYCLOAK_LOGLEVEL=ALL',
                'KEYCLOAK_PRODUCTION=true',
                'KEYCLOAK_PROXY=edge',
                'KEYCLOAK_PROXY_ADDRESS_FORWARDING=true',
                'KEYCLOAK_HTTP_PORT=8080',
                `KEYCLOAK_DATABASE_VENDOR=postgresql`,
                `KEYCLOAK_ADMIN_PASSWORD=${password}`,
                `KEYCLOAK_ADMIN=${username}`,
                Pulumi.interpolate`KEYCLOAK_DATABASE_USER=${postgresConnexion.name}`,
                `KEYCLOAK_DATABASE_NAME=${keycloakDatabaseName}`,
                Pulumi.interpolate`KEYCLOAK_DATABASE_PASSWORD=${postgresConnexion.password}`,
                'KEYCLOAK_DATABASE_PORT=5432',
                Pulumi.interpolate`KEYCLOAK_DATABASE_HOST=${this.postgresPlugin.getPrivateHostName(config)}`,
            ],
            labels: [
                {
                  value: `Host(\`${this.getKeycloakUri()}\`)`,
                  label: `traefik.http.routers.${key}.rule`
                },
                {
                  label: `traefik.http.routers.${key}.entrypoints`,
                  value: 'websecure'
                },
                {
                  label: `traefik.http.routers.${key}.tls`,
                  value: 'true'
                },
                {
                  label: `traefik.http.routers.${key}.tls.certresolver`,
                  value: 'le'
                },
                {
                    label: `traefik.http.services.${key}.loadbalancer.server.port`,
                    value: '8080'
                },
                {
                  label: 'traefik.enable',
                  value: 'true'
                }
              ],
            networksAdvanced: [
                {
                    name: Pulumi.interpolate`${traefikNetwork.name}`
                },
                {
                  name: Pulumi.interpolate`${network.name}`
                }
            ],
            healthcheck: {
                interval: '30s',
                timeout: '10s',
                retries: 3,
                tests: ["CMD", "curl", "-f", "http://localhost:8080/health"]
            },
            wait: true
        }, { provider: this.dockerProvider })

        resource[key] = instance

        }

        return {
            username,
            password,
            clientId,
            realm,
            url: `https://${uri}`
        }
    }

    private async getKeycloakProvider(config: ConfigDeployement, resource: ResourceToDeploy): Promise<Keycloak.Provider> {
        const key = this.getKeycloakKey()
        const providerKey = `${key}-config-provider`

        if(resource[providerKey]) {
            return resource[providerKey] as Keycloak.Provider
        }

        const instance = await this.getInstance(key, resource, config)
        const provider = new Keycloak.Provider(providerKey, {
            clientId: instance.clientId,
            url : instance.url,
            password: instance.password,
            username: instance.username,
            realm: instance.realm
        })

        resource[providerKey] = provider

        return provider
    }

    private async getRealm(resource: ResourceToDeploy, config: ConfigDeployement, realmName: string): Promise<Keycloak.Realm> {
        const provider = await this.getKeycloakProvider(config, resource)
        const key = this.getKeycloakKey()
        const realmKey = `${key}-realm-${realmName}`

        if(resource[realmKey]) {
            return resource[realmKey] as Keycloak.Realm
        }

        const realm = new Keycloak.Realm(realmKey,{
            realm: realmName,
        }, {
            provider
        })

        resource[realmKey] = realm

        return realm
    }

    async getServiceAccount(backendPlugin: KeycloakBackendPlugin, resource: ResourceToDeploy, config: ConfigDeployement): Promise<setPluginReturn> {
        const key = `${this.getKeycloakKey()}-realm-${backendPlugin.realmName}-connexion-service-account-${backendPlugin.clientName}`

        const provider = await this.getKeycloakProvider(config, resource)
        const realm = await this.getRealm(resource, config, backendPlugin.realmName)
        const client_secret = this.secretManager.getOrCreateSecret(key)
        const network = this.getKeycloakNetwork(config, resource)

        const client = new Keycloak.openid.Client(key, {
            realmId: realm.id,
            clientId: backendPlugin.clientName,
            name:  backendPlugin.clientName,
            accessType: 'CONFIDENTIAL',
            serviceAccountsEnabled: true,
            clientSecret: client_secret
        }, {
            provider,
        })

        return {
            envs: [
                Pulumi.interpolate`${backendPlugin.exportedEnvMapping.clientId}=${client.clientId}`,
                Pulumi.interpolate`${backendPlugin.exportedEnvMapping.url}=https://${this.getKeycloakUri()}`,
                Pulumi.interpolate`${backendPlugin.exportedEnvMapping.realmName}=${client.realmId}`,
                Pulumi.interpolate`${backendPlugin.exportedEnvMapping.clientSecret}=${client.clientSecret}`
            ],
            networks: [network.name] 
        }
    }

    async getPrivateClient(frontendPlugin: KeycloakFrontendPrivatePlugin, resource: ResourceToDeploy, config: ConfigDeployement): Promise<setPluginReturn> {
        const key = `${this.getKeycloakKey()}-realm-${frontendPlugin.realmName}-connexion-private-client-${frontendPlugin.clientName}`

        const provider = await this.getKeycloakProvider(config, resource)
        const realm = await this.getRealm(resource, config, frontendPlugin.realmName)
        const client_secret = this.secretManager.getOrCreateSecret(key)

        const client = new Keycloak.openid.Client(key, {
            realmId: realm.id,
            clientId: frontendPlugin.clientName,
            name:  frontendPlugin.clientName,
            accessType: 'CONFIDENTIAL',
            clientSecret: client_secret
        }, {
            provider,
        })

        return {
            envs: [
                Pulumi.interpolate`${frontendPlugin.exportedEnvMapping.clientId}=${client.clientId}`,
                Pulumi.interpolate`${frontendPlugin.exportedEnvMapping.issuer}=https://${this.getKeycloakUri()}/realms/${client.realmId}`,
                Pulumi.interpolate`${frontendPlugin.exportedEnvMapping.clientSecret}=${client.clientSecret}`
            ],
            networks: [] 
        }
    }

    async getPublicClient(frontendPlugin: KeycloakFrontendPublicPlugin, resource: ResourceToDeploy, config: ConfigDeployement): Promise<setPluginReturn> {
        const key = `${this.getKeycloakKey()}-realm-${frontendPlugin.realmName}-connexion-private-client-${frontendPlugin.clientName}`

        const provider = await this.getKeycloakProvider(config, resource)
        const realm = await this.getRealm(resource, config, frontendPlugin.realmName)

        const client = new Keycloak.openid.Client(key, {
            realmId: realm.id,
            clientId: frontendPlugin.clientName,
            name:  frontendPlugin.clientName,
            accessType: 'PUBLIC',
        }, {
            provider,
        })

        return {
            envs: [
                Pulumi.interpolate`${frontendPlugin.exportedEnvMapping.clientId}=${client.clientId}`,
                Pulumi.interpolate`${frontendPlugin.exportedEnvMapping.issuer}=https://${this.getKeycloakUri()}/realms/${client.realmId}`,
            ],
            networks: [] 
        }
    }
}
