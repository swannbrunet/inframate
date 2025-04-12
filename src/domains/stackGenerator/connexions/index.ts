import { Provider } from "@pulumi/docker";
import { Service } from "../../projectStackType/service.type.js";
import { ConfigDeployement } from "../config.type.js";
import { Output } from "@pulumi/pulumi";
import { getPluginFromConnexionKind } from "../plugins/index.js";

export interface setPluginReturn {
    envs: (string | Output<string>)[]
    networks: (string | Output<string>)[]
    labels: any[]
}

export async function getPluginsConnexion(service: Service, config: ConfigDeployement): Promise<setPluginReturn> {

    const environment: (string | Output<string>)[]  = []
    const networks: (string | Output<string>)[] = []
    const labels = []

    for (let i = 0; i < service.plugins.length; i++) {
        const plugin = service.plugins[i]
        const pluginToCall = getPluginFromConnexionKind(config, plugin.kind, plugin.clusterName)
        const ressource = await pluginToCall.getConnexion(plugin)
        if(ressource.envs) {
            environment.push(...ressource.envs)
        }
        if(ressource.networks) {
            networks.push(...ressource.networks)
        }
        if(ressource.labels) {
            labels.push(...ressource.labels)
        }

    }
    return {
        envs: environment,
        networks,
        labels
    }
}
