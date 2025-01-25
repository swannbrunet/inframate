import { Provider } from "@pulumi/docker";
import { Service } from "../../projectStackType/service.type";
import { ConfigDeployement, ResourceToDeploy } from "../config.type";
import { getMongoDBConnexion } from "./mongodb.plugin";
import { Output } from "@pulumi/pulumi";
import { getServiceConnexion } from "./serviceConnexion.plugin";
import { Plugin } from "../../projectStackType/plugin.type";

export interface setPluginReturn {
    envs: string[]
    networks: (string | Output<string>)[]
}

async function notImplemented (_plugin?: any, _config?: ConfigDeployement, _provider?: Provider, _resources?: ResourceToDeploy): Promise<setPluginReturn> {
    throw new Error('Plugin not implemented')
}

const pluginfunctionMapping: {[key in Plugin['kind']]: (plugin: any, config: ConfigDeployement, provider: Provider, resources: ResourceToDeploy) => Promise<setPluginReturn>} = {
    typesense: notImplemented,
    mongoDB: getMongoDBConnexion,
    "keycloak-backend": notImplemented,
    "keycloak-frontend-private": notImplemented,
    "keycloak-frontend-public": notImplemented,
    postgreSQL: notImplemented,
    serviceConnexion: getServiceConnexion
}

export async function setPlugins(service: Service, config: ConfigDeployement, provider: Provider, resources: ResourceToDeploy): Promise<setPluginReturn> {

    const environment: string[] = []
    const networks: (string | Output<string>)[] = []

    for (let i = 0; i < service.plugins.length; i++) {
        const plugin = service.plugins[i]
        const pluginToCall = pluginfunctionMapping[plugin.kind]
        if(pluginToCall) {
            await pluginToCall(plugin, config, provider, resources).then(result => {
                environment.push(...result.envs)
                networks.push(...result.networks)
            })
        } else {
            await notImplemented()
        }
    }
    return {
        envs: environment,
        networks
    }
}