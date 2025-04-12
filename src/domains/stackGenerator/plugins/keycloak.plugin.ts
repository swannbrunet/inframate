import {AbstractPlugin, ConnexionSetting, DeploymentPlan, StageType} from "./abstract.plugin.js";
import {KeycloakConnexion} from "../../projectStackType/pluginConnexion.type.js";
import {
    KeycloakConfigPlugin,
} from "../../projectStackType/plugin.type.js";
import * as Docker from "@pulumi/docker";
import Pulumi from "@pulumi/pulumi";
import { ConfigDeployement } from "../config.type.js";
import { PostgresPlugin } from "./postgres.plugin.js";
import { TraefikPlugin } from "./traefik.plugin.js";
import {Deployment} from "@pulumi/pulumi/automation";

export class KeycloakPlugin extends AbstractPlugin {
    static kind = "keycloak";
    getConnexionKindNames(): string[] {
        return ['keycloak-service-account', 'keycloak-frontend-private', 'keycloak-frontend-public']
    }
    declare config: KeycloakConfigPlugin;
    public readonly type: string = KeycloakPlugin.name;
    private readonly identifier: string;
    private readonly username: string = 'admin';
    private password?: string;
    private database: PostgresPlugin;
    private traefik: TraefikPlugin;

    constructor(config: KeycloakConfigPlugin, configDeployment: ConfigDeployement) {
        super(config, configDeployment);
        this.identifier = `${configDeployment.projectName}-${configDeployment.stackName}-keycloak-${config.clusterName}`;
        this.database = PostgresPlugin.getPlugin({
            prodDedicated: false,
            reviewDedicated: false,
            kind: 'postgres',
            clusterName: 'keycloak'
        }, configDeployment)
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
                tests: ["CMD", "curl", "-f", "http://localhost:8080/health/ready"]
            },
            wait: true
        }, { provider })
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
                    await this.database.overrideConnexionStateValue(state)
                    await this.traefik.overrideConnexionStateValue(state)
                },
                temporary: false
            }
        ]
    }

    async getConnexion(setting: KeycloakConnexion): Promise<ConnexionSetting> {
        return {
            envs: [],
            networks: []
        }
    }

    getName(): string {
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
}
