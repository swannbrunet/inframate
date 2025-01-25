import { Provider } from "@pulumi/docker";
import { Service } from "../../projectStackType/service.type";
import { ConfigDeployement, ResourceToDeploy } from "../config.type";
import { MongoDBPlugin } from "../../projectStackType/plugin.type";
import * as Docker from "@pulumi/docker"
import { setPluginReturn } from ".";
import { PostgreSQLPlugin } from "../../projectStackType/globalPlugin.type";

export async function getPostgresInstance() {

}

export async function getPostgresConnexion(postgresDBPlugin: PostgreSQLPlugin, config: ConfigDeployement, provider: Provider, resources: ResourceToDeploy): Promise<setPluginReturn> {
    const key = `${config.projectName}-${config.stackName}-plugin-mongodb`

    const DEFAULT_USER = 'user'

    const existingRessource = resources[key]
    if(existingRessource) {
        const password = await config.secretManager.getSecret(`${key}-password`)
        return  { 
            envs: [`${postgresDBPlugin.exportedEnvMapping.uri}=mongodb://${DEFAULT_USER}:${password}@${key}:27017/`],
            networks: [(resources[`${key}-network`] as Docker.Network).name]
    }
    } else {
        const password = await config.secretManager.getOrCreateSecret(`${key}-password`)

        const network = new Docker.Network(`${key}-network`, {
            name: `${key}-network`
        })
        resources[`${key}-network`] = network

        const instance = new Docker.Container(key, {
            image: "mongo:7.0.16",
            name: key,
            restart: 'always',
            envs: [
                `MONGO_INITDB_ROOT_USERNAME=${DEFAULT_USER}`,
                `MONGO_INITDB_ROOT_PASSWORD=${password}`,
                `MONGO_INITDB_DATABASE=${postgresDBPlugin.databaseName}`
            ],
            networksAdvanced: [
                {
                    name: network.name
                }
            ],
        }, { provider: provider, dependsOn: [network] })
        resources[key] = instance
        return  { 
            envs: [`${postgresDBPlugin.exportedEnvMapping.uri}=mongodb://${DEFAULT_USER}:${password}@${key}:27017/`],
            networks: [network.name]
    }
    }
}