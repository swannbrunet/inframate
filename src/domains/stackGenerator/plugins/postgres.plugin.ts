import { Provider as DockerProvider } from "@pulumi/docker";
import { ConfigDeployement, ResourceToDeploy } from "../config.type.js";
import * as Docker from "@pulumi/docker"
import Pulumi from "@pulumi/pulumi"
import { setPluginReturn } from "./index.js";
import { PostgreSQLPlugin } from "../../projectStackType/globalPlugin.type.js";
import * as Postgres from "@pulumi/postgresql";
import { secretManager } from "../../secretManager/index.js";

const ADMIN_POSTGRES_USER = 'admin'

export class PostgresPlugin {
    constructor(private dockerProvider: DockerProvider, private secretManager: secretManager) {}

    private getPostgresPluginKey(config: ConfigDeployement): string {
        return  `${config.projectName}-${config.stackName}-plugin-postgres`
    }

    private async getPostgresInstance(key: string, resources: ResourceToDeploy): Promise<{instance: Docker.Container, network: Docker.Network}> {
        const existingRessource = resources[key]
        if(existingRessource) {
            return {
                instance: existingRessource as Docker.Container,
                network: resources[`${key}-network`] as Docker.Network
            }
        } else {
            const password = await this.secretManager.getOrCreateSecret(`${key}-password`)
    
            const network = new Docker.Network(`${key}-network`, {
                name: `${key}-network`
            })
            resources[`${key}-network`] = network
    
            const instance = new Docker.Container(key, {
                image: "postgres:15.10",
                name: key,
                restart: 'always',
                envs: [
                    `POSTGRES_PASSWORD=${ADMIN_POSTGRES_USER}`,
                    `POSTGRES_USER=${password}`,
                ],
                networksAdvanced: [
                    {
                        name: network.name
                    }
                ],
                wait: true,
                healthcheck: {
                    tests: ["CMD", "pg_isready", "-U", ADMIN_POSTGRES_USER],
                    interval: "10s",
                    retries: 6,
                    timeout: "5s",
                }
            }, { provider: this.dockerProvider, dependsOn: [network] })
            resources[key] = instance
    
            return {
                instance,
                network
            }
    
        }
    }
    
    async getConnexion(config: ConfigDeployement, databaseName: string, resources: ResourceToDeploy): Promise<Postgres.Role> {
        const key = this.getPostgresPluginKey(config)
        const ressourceName = `${key}-${databaseName}-connexion`
        const connexion = resources[ressourceName] as Postgres.Role | undefined
        if (connexion) {
            return connexion as Postgres.Role
        }
        const adminPassword = await this.secretManager.getOrCreateSecret(`${key}-password`)
        const user = await this.secretManager.getOrCreateSecret(`${ressourceName}-username`)
        const password = await this.secretManager.getOrCreateSecret(`${ressourceName}-password`)
        const postgresInstance = await this.getPostgresInstance(key, resources)
        const provider = new Postgres.Provider("pgProvider", {
            host: postgresInstance.instance.name,
            username: ADMIN_POSTGRES_USER,
            password: adminPassword
        })
        const role = new Postgres.Role(`${ressourceName}`, {
            name: user,
            password: password,
            login: true
        }, { provider })
    
        const database = new Postgres.Database(`${key}-${databaseName}`, {
            name: `${key}-${databaseName}`,
            owner: role.name
        }, { provider })
    
        resources[ressourceName] = role;
        resources[`${key}-${databaseName}`] = database;
        return role;
    }

    getPrivateHostName(config: ConfigDeployement): string {
        return this.getPostgresPluginKey(config)
    }
    
    async getPostgresConnexionForService(postgresDBPlugin: PostgreSQLPlugin, config: ConfigDeployement, resources: ResourceToDeploy): Promise<setPluginReturn> {
        const key = this.getPostgresPluginKey(config)
    
        const postgres = await this.getPostgresInstance(key, resources)
    
        const connexion = await this.getConnexion(config, postgresDBPlugin.databaseName, resources)
    
            return  { 
                envs: [Pulumi.interpolate`${postgresDBPlugin.exportedEnvMapping.uri}=psql://${connexion.name}:${connexion.password}@${key}:27017/`],
                networks: [postgres.network.name]
        }
    }
}