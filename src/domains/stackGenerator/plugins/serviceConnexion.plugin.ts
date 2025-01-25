import { Provider } from "@pulumi/docker";
import { ConfigDeployement, ResourceToDeploy } from "../config.type";
import { ServiceConnexionPlugin } from "../../projectStackType/plugin.type";
import { setPluginReturn } from ".";

export async function getServiceConnexion(serviceConnexionPlugin: ServiceConnexionPlugin, config: ConfigDeployement, _provider: Provider, _resources: ResourceToDeploy): Promise<setPluginReturn> {
    if (serviceConnexionPlugin.mode === 'private') {
        throw new Error(`Private service connexion are not implemented`)
    } else {
        const service = config.contextRessource.services.find(value => value.name === serviceConnexionPlugin.serviceName);
        if(service) {
            if(!service.exposedPort) {
                throw new Error(`service [${serviceConnexionPlugin.serviceName}] not public`)
            }
            const domainPrefix = service.externalDomainPrefix ? `${service.externalDomainPrefix}.` : ''
            const stackEnvPrefix = config.isProd ? '' : `${config.stackName}.`
            let url = `https://${domainPrefix}${stackEnvPrefix}${config.externalDomain}`
            if(serviceConnexionPlugin.templateUrl) {
                url = `${serviceConnexionPlugin.templateUrl}`.replace('{{url}}', url)
            }
            return {
                envs: [`${serviceConnexionPlugin.exportEnvMapping.url}=${url}`], 
                networks: []
            }
        } else {
            throw new Error(`service [${serviceConnexionPlugin.serviceName}] not found`)
        }
    }
}