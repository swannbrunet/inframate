import {AbstractPlugin, type ConnexionSetting, type DeploymentPlan, StageType} from "./abstract.plugin.ts";
import type {ConfigDeployement} from "../config.type.ts";
import type {
    PostgresConfigPlugin,
    TypesenseConfigPlugin
} from "../../projectStackType/plugin.type.ts";
import * as Docker from "@pulumi/docker";
import type {PostgresConnexion} from "../../projectStackType/pluginConnexion.type.ts";
import Pulumi from "@pulumi/pulumi";
import * as Postgres from "@pulumi/postgresql";
import type {Deployment} from "@pulumi/pulumi/automation";
import {generateId} from "../../utils/generateNumberFromIdentifier.ts";


export class PostgresPlugin extends AbstractPlugin {
    static kind = "postgres";
    declare config: TypesenseConfigPlugin;
    public readonly type: string = PostgresPlugin.name;
    private networkName: string;
    public readonly identifier: string;
    private readonly user: string = 'user';
    private password?: string;
    private configPort?: number;
    private projectName: string;

    constructor(config: PostgresConfigPlugin, configDeployment: ConfigDeployement) {
        super(config, configDeployment);
        this.identifier = `${configDeployment.projectName}-${configDeployment.stackName}-postgres-${config.clusterName}`;
        this.networkName = `${this.identifier}-network`
        this.projectName = `${configDeployment.projectName}-postgres-${config.clusterName}`;
        this.clusterName = config.clusterName
        this.configPort = 20000 + generateId(this.identifier);
    }

    private async generateRequirementEnvironementRessource(provider: Docker.Provider): Promise<any> {
        new Docker.Network(`${this.identifier}-network`, {
            name: `${this.identifier}-network`
        }, { provider })
    }

    private async generateTemporaryEnvironmentResourceConfig(provider: Docker.Provider): Promise<any> {
        new Docker.Container(`${this.identifier}-proxy`, {
            image: "alpine/socat",
            networksAdvanced: [{ name: `${this.identifier}-network` }],
            command: ["TCP-LISTEN:5432,fork", `TCP:${this.identifier}:5432`], // Redirige localhost:5433 vers PostgreSQL
            ports: [{ internal: 5432, external: this.configPort }],
        }, { provider })
    }

    private async generateInstance(provider: Docker.Provider): Promise<any> {

        this.password = await this.configDeployment.secretManager.getOrCreateSecret(`${this.identifier}-password`)
        const volume = new Docker.Volume(`${this.identifier}-volume`, {
        name: `${this.identifier}-volume`
    }, { provider })

        const image = new Docker.RemoteImage("postgresImage", {
            name: "postgres:17",
        });

   new Docker.Container(this.identifier, {
        image: image.imageId,
        name: this.identifier,
        restart: 'always',
        envs: [
            `POSTGRES_PASSWORD=${this.password}`,
            `POSTGRES_USER=${this.user}`,
        ],
        networksAdvanced: [
            {
                name: this.networkName
            }
        ],
        volumes: [
            {
                containerPath: "/var/lib/postgresql/data",
                volumeName: volume.name
            }
        ],
        wait: true,
        healthcheck: {
            tests: ["CMD", "pg_isready", "-U", this.user],
            interval: "10s",
            retries: 6,
            timeout: "5s",
            startPeriod: '60s',
        },
        labels: [
            {
                label: "com.docker.compose.project",
                value: `${this.configDeployment.projectName}-${this.configDeployment.stackName}`
            }
        ],
    }, { provider, ignoreChanges: ["networkMode", "healthcheck"], })
    }
    getDeploymentPlan(): DeploymentPlan {
        return [
            {
                project: `${this.projectName}-step1`,
                stack: this.configDeployment.stackName,
                type: StageType.INFRA,
                run: async () => {
                    const provider = this.configDeployment.provider()
                    await this.generateRequirementEnvironementRessource(provider)
                    await this.generateInstance(provider)
                },
                temporary: false
            }, {
                project: `${this.projectName}-step2`,
                stack: this.configDeployment.stackName,
                type: StageType.INFRA,
                run: async () => {
                    const provider = this.configDeployment.provider()
                    await this.generateTemporaryEnvironmentResourceConfig(provider)
                },
                temporary: true
            }
        ]
    }

    getConnexionKindNames(): string[] {
        return ['postgres'];
    }

    async getConnexion(setting: PostgresConnexion): Promise<ConnexionSetting> {
        const connexionProvider = new Postgres.Provider(`${this.identifier}-provider-connexion`, {
            host: 'localhost',
            port: this.configPort,
            username: this.user,
            password: this.password,
            sslmode: "disable",
            connectTimeout: 20
        })
        const envs = []
        const key = `${this.identifier}-${setting.databaseName}-${setting.right}`
        const user = await this.configDeployment.secretManager.getOrCreateSecret(`${key}-username`)
        const password = await this.configDeployment.secretManager.getOrCreateSecret(`${key}-password`)

        const role = new Postgres.Role(`${key}-role`, {
            name: user,
            password: password,
            login: true
        }, { provider: connexionProvider })

        const database = new Postgres.Database(`${key}`, {
            name: `${setting.databaseName}`,
            owner: role.name
        }, { provider: connexionProvider })

        if(setting.exportedEnvMapping.uri) {
            envs.push(Pulumi.interpolate`${setting.exportedEnvMapping.uri}=postgres://${user}:${password}@${this.identifier}:5432/${database.name}?sslmode=disable`)
        }
        if(setting.exportedEnvMapping.host) {
            envs.push(Pulumi.interpolate`${setting.exportedEnvMapping.host}=${this.identifier}`)
        }
        if(setting.exportedEnvMapping.port) {
            envs.push(`${setting.exportedEnvMapping.port}=5432`)
        }
        if(setting.exportedEnvMapping.username) {
            envs.push(`${setting.exportedEnvMapping.username}=${user}`)
        }
        if(setting.exportedEnvMapping.password) {
            envs.push(`${setting.exportedEnvMapping.password}=${password}`)
        }
        if(setting.exportedEnvMapping.database) {
            envs.push(Pulumi.interpolate`${setting.exportedEnvMapping.database}=${database.name}`)
        }
        return { envs, networks: this.networkName ? [this.networkName] : [] }
    }

    getLabel(): string {
        return this.config.clusterName;
    }

    static getPlugin(config: PostgresConfigPlugin,
                     configDeployment: ConfigDeployement): PostgresPlugin {
        const identifier = `${configDeployment.projectName}-${configDeployment.stackName}-postgres-${config.clusterName}`
        if(configDeployment.resources.resources[identifier]) {
            return configDeployment.resources.resources[identifier] as PostgresPlugin;
        } else {
            const plugin = new PostgresPlugin(config, configDeployment);
            configDeployment.resources.resources[plugin.identifier] = plugin;
            return plugin;
        }
    }

    async overrideConnexionStateValue(state: Deployment): Promise<void> {
        if(state?.deployment?.resources) {
            state.deployment.resources.forEach((resource: any) => {
                if (resource.urn.includes(`${this.identifier}-provider-connexion`)) {
                    resource.inputs.port = `${this.configPort}`;
                    resource.port = `${this.configPort}`;
                }
            });
        }
    }
}
