import type {ServiceConnexion} from "../../projectStackType/pluginConnexion.type.ts";
import type {ConfigDeployement} from "../config.type.ts";
import {AbstractPlugin, type ConnexionSetting} from "./abstract.plugin.ts";


export class ServiceConnexionPlugin extends AbstractPlugin {
    kind: string = "serviceConnexion";
    identifier: string = `serviceConnexion`;
    type: string = ServiceConnexionPlugin.name;

    getConnexionKindNames(): string[] {
        return ["serviceConnexion"];
    }

    getDeploymentPlan() {
        return []
    }

    async getConnexion(setting: ServiceConnexion): Promise<ConnexionSetting> {
        if (setting.mode === 'private') {
            throw new Error(`Private service connexion are not implemented`)
        }
        const service = this.configDeployment.contextRessource.services.find(value => value.name === setting.serviceName);
        if (!service) {
            throw new Error(`service [${setting.serviceName}] not found`)
        }
        if (!service.exposedPort) {
            throw new Error(`service [${setting.serviceName}] not public`)
        }
        const domainPrefix = service.externalDomainPrefix ? `${service.externalDomainPrefix}.` : ''
        const stackEnvPrefix = this.configDeployment.isProd ? '' : `${this.configDeployment.stackName}.`
        let url = `https://${domainPrefix}${stackEnvPrefix}${this.configDeployment.domain}`
        if (setting.templateUrl) {
            url = `${setting.templateUrl}`.replace('{{url}}', url)
        }
        return {
            envs: [`${setting.exportEnvMapping.url}=${url}`],
        }
    }

    static getPlugin(config: any,
                     configDeployment: ConfigDeployement): ServiceConnexionPlugin {
        const identifier = `serviceConnexion`;
        if(configDeployment.resources.resources[identifier]) {
            return configDeployment.resources.resources[identifier] as ServiceConnexionPlugin;
        } else {
            const plugin = new ServiceConnexionPlugin(config, configDeployment);
            configDeployment.resources.resources[plugin.identifier] = plugin;
            return plugin;
        }
    }
}
