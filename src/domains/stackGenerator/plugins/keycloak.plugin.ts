import {AbstractPlugin, type ConnexionSetting, type DeploymentPlan, StageType} from "./abstract.plugin.ts";
import type {KeycloakConnexion} from "../../projectStackType/pluginConnexion.type.ts";
import type {
    KeycloakConfigPlugin,
} from "../../projectStackType/plugin.type.ts";
import * as Docker from "@pulumi/docker";
import Pulumi from "@pulumi/pulumi";
import type {ConfigDeployement} from "../config.type.ts";
import { PostgresPlugin } from "./postgres.plugin.ts";
import { TraefikPlugin } from "./traefik.plugin.ts";
import type {Deployment} from "@pulumi/pulumi/automation";
import * as Keycloak from "@pulumi/keycloak";
import { generateId } from "../../utils/generateNumberFromIdentifier.ts";

export class KeycloakPlugin extends AbstractPlugin {
    static kind = "keycloak";
    getConnexionKindNames(): string[] {
        return ['keycloak-service-account', 'keycloak-frontend-private', 'keycloak-frontend-public']
    }
    declare config: KeycloakConfigPlugin;
    public readonly type: string = KeycloakPlugin.name;
    public readonly identifier: string;
    private readonly username: string = 'admin';
    private password?: string;
    private readonly database: PostgresPlugin;
    private readonly traefik: TraefikPlugin;
    private readonly url: string;
    private configPort: number;
    private configUrl: string;
    private realmNames: string[] = []

    constructor(config: KeycloakConfigPlugin, configDeployment: ConfigDeployement) {
        super(config, configDeployment);
        this.identifier = `${configDeployment.projectName}-${configDeployment.stackName}-keycloak-${config.clusterName}`;
        const hash = generateId(this.identifier);
        this.configPort = 20000 + hash
        this.configUrl = `http://localhost:${this.configPort}`
        this.database = PostgresPlugin.getPlugin({
            prodDedicated: false,
            reviewDedicated: false,
            kind: 'postgres',
            clusterName: 'keycloak'
        }, configDeployment)
        this.url = `${this.config.externalDomainPrefix}.${this.configDeployment.stackName}.${this.configDeployment.domain}`
        this.traefik = TraefikPlugin.getPlugin({kind: 'traefik',}, configDeployment)
        this.dependencies = [this.database, this.traefik]
        this.clusterName = config.clusterName
    }

    private async generateInstance()  {
        const provider = this.configDeployment.provider()
        this.password = await this.configDeployment.secretManager.getOrCreateSecret(`${this.identifier}-password`)
        const databaseSetting = await this.database.getConnexion({
            clusterName: "keycloak",
            databaseName: "keycloak",
            kind: "postgres",
            right: 'rw',
            exportedEnvMapping: {
                password: 'KEYCLOAK_DATABASE_PASSWORD',
                username: 'KEYCLOAK_DATABASE_USER',
                host: 'KEYCLOAK_DATABASE_HOST',
                port: 'KEYCLOAK_DATABASE_PORT',
                database: 'KEYCLOAK_DATABASE_NAME'
            },
        })
        const traefikSetting = await this.traefik.getConnexion(
            {
                kind: "traefik",
                port: 8080,
                domain: `${this.config.externalDomainPrefix}.${this.configDeployment.stackName}.${this.configDeployment.domain}`,
                identifier: `${await this.configDeployment.secretManager.getOrCreateSecret(`${this.identifier}-traefik-identifier`)}-keycloak`,
            }
        )
        const keycloakImage = new Docker.RemoteImage("keycloak", {
            name: `docker.io/bitnami/keycloak:22.0.3`,
        }, {
            provider
        });
        const network = new Docker.Network(`${this.identifier}-network`, {
            name: `${this.identifier}-network`
        }, { provider })
        new Docker.Container(this.identifier, {
            image: keycloakImage.imageId,
            name: this.identifier,
            restart: 'always',
            envs: [
                'KEYCLOAK_CREATE_ADMIN_USER=true',
                'KEYCLOAK_LOGLEVEL=ALL',
                'KEYCLOAK_PRODUCTION=true',
                'KEYCLOAK_PROXY=edge',
                'KEYCLOAK_PROXY_ADDRESS_FORWARDING=true',
                'KEYCLOAK_HTTP_PORT=8080',
                `KEYCLOAK_DATABASE_VENDOR=postgresql`,
                `KEYCLOAK_ADMIN_PASSWORD=${this.password}`,
                `KEYCLOAK_ENABLE_HEALTH_ENDPOINTS=true`,
                `KEYCLOAK_ADMIN=${this.username}`,
                ...(databaseSetting.envs || [])
            ],
            labels: [
                ...traefikSetting.labels || []
            ],
            networksAdvanced: [
                {
                    name: Pulumi.interpolate`${network.name}`
                },
                ...(databaseSetting.networks?.map(name => ({ name })) || []),
                ...(traefikSetting.networks?.map(name => ({ name })) || [])
            ],
            healthcheck: {
                interval: '10s',
                timeout: '10s',
                retries: 10,
                startPeriod: '60s',
                tests: ["CMD", "curl", "-f", "http://localhost:8080/health/ready"]
            },
            wait: true
        }, { provider })
    }

    private getKeycloakConnexionProvider() {
        return new Keycloak.Provider(`${this.identifier}-provider-connexion`,
            {
                url: this.configUrl,
                clientId: 'admin-cli',
                username: this.username,
                password: this.password,
            }
        )
    }

    getDeploymentPlan(): DeploymentPlan {
        return [
            {
                project: `${this.identifier}-step-1`,
                stack: this.configDeployment.stackName,
                type: StageType.INFRA,
                run: async () => {
                    await this.generateInstance()
                },
                overrideStackValue: async (state: Deployment) => {
                    try {
                        await this.database.overrideConnexionStateValue(state)
                        await this.traefik.overrideConnexionStateValue(state)
                    } catch {}
                },
                temporary: false
            },
            {
                project: `${this.identifier}-step-2`,
                stack: this.configDeployment.stackName,
                type: StageType.INFRA,
                run: async () => {
                    const provider = this.configDeployment.provider()
                    await this.generateTemporaryEnvironmentResourceConfig(provider)
                },
                temporary: true
            },
            {
                project: `${this.identifier}-step-3`,
                stack: this.configDeployment.stackName,
                type: StageType.INFRA,
                run: () => this.configRealm(),
                temporary: false,
                overrideStackValue: async (stack) => {
                   await this.overrideConnexionStateValue(stack)
                }
            }
        ]
    }

    async configRealm(): Promise<void> {
        const provider = this.getKeycloakConnexionProvider()
        const realms = this.config.realms.map((realm) => {
            const id = realm.name.replace(' ', '-')
            new Keycloak.Realm(`${this.identifier}-realm-${id}`, {
                displayName: realm.name,
                internalId: id,
                realm: realm.name
            }, { provider: provider})
        })
    }

    async getConnexion(setting: KeycloakConnexion): Promise<ConnexionSetting> {
        const provider = this.getKeycloakConnexionProvider()
        if (setting.kind === 'keycloak-service-account') {
            const clientSecret = this.configDeployment.secretManager.getOrCreateSecret(`${this.identifier}-${setting.realmName}-${setting.clientName}-secret`)
            const client = new Keycloak.openid.Client("openid_client", {
                realmId: setting.realmName,
                clientId: setting.clientName,
                clientSecret: clientSecret,
                name: `client account for ${setting.clientName}`,
                enabled: true,
                accessType: "CONFIDENTIAL",
                serviceAccountsEnabled: true,
            }, {provider: provider})

            return {
                envs: [Pulumi.interpolate`${setting.exportedEnvMapping.realmName}=${setting.realmName}`,
                    Pulumi.interpolate`${setting.exportedEnvMapping.url}=http://${this.identifier}`, // TODO : il manque le port d'expositions
                    Pulumi.interpolate`${setting.exportedEnvMapping.clientId}=${setting.clientName}`,
                    Pulumi.interpolate`${setting.exportedEnvMapping.clientSecret}=${clientSecret}`,
                ],
                networks: [`${this.identifier}-network`]
            }
        }
        if(setting.kind === 'keycloak-frontend-private') {
            const clientSecret = this.configDeployment.secretManager.getOrCreateSecret(`${this.identifier}-${setting.realmName}-${setting.clientName}-secret`)
            const client = new Keycloak.openid.Client("openid_client", {
                realmId: setting.realmName,
                clientId: setting.clientName,
                clientSecret: clientSecret,
                name: `client account for ${setting.clientName}`,
                enabled: true,
                accessType: "CONFIDENTIAL",
                standardFlowEnabled: true,
                validRedirectUris: [setting.validRedirectUri],
                validPostLogoutRedirectUris: [setting.validRedirectUri],
                loginTheme: "keycloak",
            }, {provider: provider})

            return {
                envs: [Pulumi.interpolate`${setting.exportedEnvMapping.issuer}=${this.url}/realms/${client.realmId}`,
                    Pulumi.interpolate`${setting.exportedEnvMapping.clientId}=${setting.clientName}`,
                    Pulumi.interpolate`${setting.exportedEnvMapping.clientSecret}=${clientSecret}`,
                ],
                networks: []
            }
        }
            const clientSecret = this.configDeployment.secretManager.getOrCreateSecret(`${this.identifier}-${setting.realmName}-${setting.clientName}-secret`)
            const client = new Keycloak.openid.Client("openid_client", {
                realmId: setting.realmName,
                clientId: setting.clientName,
                clientSecret: clientSecret,
                name: `client account for ${setting.clientName}`,
                enabled: true,
                accessType: 'PUBLIC',
                validRedirectUris: [setting.validRedirectUri],
                standardFlowEnabled: true,
                validPostLogoutRedirectUris: [setting.validRedirectUri],
                loginTheme: "keycloak",
            }, {provider: provider})

            return {
                envs: [Pulumi.interpolate`${setting.exportedEnvMapping.issuer}=${this.url}/realms/${client.realmId}`,
                    Pulumi.interpolate`${setting.exportedEnvMapping.clientId}=${setting.clientName}`,
                ],
                networks: []
            }
    }

    private async generateTemporaryEnvironmentResourceConfig(provider: Docker.Provider): Promise<any> {
        new Docker.Container(`${this.identifier}-proxy`, {
            name: `${this.identifier}-proxy`,
            image: "alpine/socat",
            networksAdvanced: [{ name: `${this.identifier}-network` }],
            command: ["TCP-LISTEN:8080,fork", `TCP:${this.identifier}:8080`], // Redirige localhost:8080 vers Keycloak
            ports: [{ internal: 8080, external: this.configPort }],
        }, { provider })
    }

    getLabel(): string {
        return this.config.clusterName
    }

    static getPlugin(config: KeycloakConfigPlugin,
                        configDeployment: ConfigDeployement): KeycloakPlugin {
            const identifier = `${configDeployment.projectName}-${configDeployment.stackName}-keycloak-${config.clusterName}`
            if(configDeployment.resources.resources[identifier]) {
                return configDeployment.resources.resources[identifier] as KeycloakPlugin;
            } else {
                const plugin = new KeycloakPlugin(config, configDeployment);
                configDeployment.resources.resources[plugin.identifier] = plugin;
                return plugin;
            }
    }

    async overrideConnexionStateValue(state: Deployment): Promise<void> {
        if(state?.deployment?.resources) {
            state.deployment.resources.forEach((resource: any) => {
                if (resource.urn.includes(`${this.identifier}-provider-connexion`)) {
                    resource.inputs.url = this.configUrl;
                    resource.outputs.url = this.configUrl;
                }
            });
        }
    }

}
