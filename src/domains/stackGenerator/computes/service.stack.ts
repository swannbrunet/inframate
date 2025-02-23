import { Service } from "../../projectStackType/service.type.js";
import * as Docker from "@pulumi/docker";
import { ConfigDeployement, ResourceToDeploy } from "../config.type.js";
import { Input } from "@pulumi/pulumi";
import { ContainerNetworksAdvanced } from "@pulumi/docker/types/input.js";
import { setPlugins } from "../plugins/index.js";

export async function generateService(service: Service, config: ConfigDeployement, provider: Docker.Provider, resources: ResourceToDeploy) {
    const image = new Docker.RemoteImage(service.image, {
        name: `${service.image}:${service.version}`
    }, { provider: provider })

    resources[service.image] = image;

    const labels = []
    const networks: Input<ContainerNetworksAdvanced>[] = []
    const environmentVars: Input<string>[] = service.vars.map(value => `${value.key}=${value.value}`.replace("{{url}}", `${!config.isProd ? `${config.stackName}.` : ''}${config.domain}`)
            .replace("{{environment}}", config.stackName))

    if(service.exposedPort) {
        labels.push({
            value: `Host(\`${service.externalDomainPrefix ? `${service.externalDomainPrefix}.` : ''}${!config.isProd ? `${config.stackName}.` : ''}${config.domain}\`)`,
            label: `traefik.http.routers.${config.projectName}-${config.stackName}-${service.name}.rule`
          },
          {
            label: `traefik.http.routers.${config.projectName}-${config.stackName}-${service.name}.entrypoints`,
            value: 'websecure'
          },
          {
            label: `traefik.http.routers.${config.projectName}-${config.stackName}-${service.name}.tls`,
            value: 'true'
          },
          {
            label: `traefik.http.routers.${config.projectName}-${config.stackName}-${service.name}.tls.certresolver`,
            value: 'le'
          },
          {
              label: `traefik.http.services.${config.projectName}-${config.stackName}-${service.name}.loadbalancer.server.port`,
              value: service.exposedPort
          },
          {
            label: 'traefik.enable',
            value: 'true'
          })
          networks.push({
            name: 'traefik'
        })
    }

    const pluginInfo = await setPlugins(service, config, provider, resources)

    environmentVars.push(...pluginInfo.envs)
    networks.push(...pluginInfo.networks.map(value => ({name: value})))

    const container = new Docker.Container(`${config.projectName}-${config.stackName}-${service.name}`, {
        name: `${config.projectName}-${config.stackName}-${service.name}`,
        image: image.imageId,
        restart: 'always',
        volumes: service.volumes,
        labels: labels,
        networksAdvanced: networks,
        envs: environmentVars,
        ports: [
          {
            internal: 8081,
            external: 8081
          }
        ]
    })

    resources[`${config.projectName}-${config.stackName}-${service.name}`] = container
}