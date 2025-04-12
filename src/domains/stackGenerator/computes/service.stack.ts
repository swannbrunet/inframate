import { Service } from "../../projectStackType/service.type.js";
import * as Docker from "@pulumi/docker";
import { ConfigDeployement, ResourceToDeploy } from "../config.type.js";
import { Input } from "@pulumi/pulumi";
import {ContainerLabel, ContainerNetworksAdvanced } from "@pulumi/docker/types/input.js";
import { getPluginsConnexion } from "../connexions/index.js";
import { TraefikPlugin } from "../plugins/traefik.plugin.js";

export async function generateService(service: Service, config: ConfigDeployement) {
    const image = new Docker.RemoteImage(service.image, {
        name: `${service.image}:${service.version}`
    }, { provider: config.provider })

    const labels: Input<Input<ContainerLabel>[]> = [{
        label: "com.docker.compose.project",
        value: `${config.projectName}-${config.stackName}`
    }]
    const networks: Input<ContainerNetworksAdvanced>[] = []
    const environmentVars: Input<string>[] = service.vars.map(value => `${value.key}=${value.value}`.replace("{{url}}", `${!config.isProd ? `${config.stackName}.` : ''}${config.domain}`)
            .replace("{{environment}}", config.stackName))

    if(service.exposedPort) {
        const domain = `${service.externalDomainPrefix ? `${service.externalDomainPrefix}.` : ''}${!config.isProd ? `${config.stackName}.` : ''}${config.domain}`
        const traefikPlugin = TraefikPlugin.getPlugin({ kind: 'traefik'}, config)
        const rules = await traefikPlugin.getConnexion({
            kind: 'traefik',
            port: service.exposedPort,
            domain: domain,
            identifier: `${config.projectName}-${config.stackName}-${service.name}`
        })
        if(rules.labels && rules.networks) {
            labels.push(...rules.labels)
            networks.push(...rules.networks.map(value => ({name: value})))
        } else {
            throw new Error('no labels or network in traefik plugin connexion')
        }
    }

    const pluginInfo = await getPluginsConnexion(service, config)

    environmentVars.push(...pluginInfo.envs)
    networks.push(...pluginInfo.networks.map(value => ({name: value})))
    labels.push(...(pluginInfo.labels || []))

    const container = new Docker.Container(`${config.projectName}-${config.stackName}-${service.name}`, {
        name: `${config.projectName}-${config.stackName}-${service.name}`,
        image: image.imageId,
        restart: 'always',
        volumes: service.volumes,
        labels: labels,
        networksAdvanced: networks,
        envs: environmentVars,
    }, { provider: config.provider })
}
