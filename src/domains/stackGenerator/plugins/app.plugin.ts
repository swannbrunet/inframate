import {AbstractPlugin, ConnexionSetting, DeploymentPlan, StageType} from "./abstract.plugin.js";
import {ConfigDeployement} from "../config.type.js";
import * as docker from "@pulumi/docker";
import {AppConfigPlugin, MongoDBConfigPlugin, TypesenseConfigPlugin} from "../../projectStackType/plugin.type.js";
import * as Docker from "@pulumi/docker";
import {MongoDBConnexion} from "../../projectStackType/pluginConnexion.type.js";
import Pulumi, {Input} from "@pulumi/pulumi";
import {Service} from "../../projectStackType/service.type.js";
import {ContainerLabel, ContainerNetworksAdvanced} from "@pulumi/docker/types/input.js";
import {TraefikPlugin} from "./traefik.plugin.js";
import {getPluginsConnexion} from "../connexions/index.js";
import {getPluginFromConnexionKind} from "./index.js";
import {Deployment} from "@pulumi/pulumi/automation";

export class AppPlugin extends AbstractPlugin {
    static kind = "app";

    declare config: AppConfigPlugin;
    public readonly type: string = AppPlugin.name;
    private readonly identifier: string;
    private readonly user: string = 'user';
    private projectName: string;

    constructor(config: Service, configDeployment: ConfigDeployement) {
        const appConfig: AppConfigPlugin = {
            kind: "app",
            ...config
        }
        super(appConfig, configDeployment);
        this.identifier = `${configDeployment.projectName}-${configDeployment.stackName}-app-${config.name}`;
        this.projectName = `${configDeployment.projectName}-app-${config.name}`;

        this.dependencies = this.config.plugins.map(value => getPluginFromConnexionKind(configDeployment, value.kind))
        this.dependencies.push(TraefikPlugin.getPlugin({kind: 'traefik'}, configDeployment))
    }


    getDeploymentPlan(): DeploymentPlan {
        return [
            {
                temporary: false,
                project: `${this.projectName}-step1`,
                stack: this.configDeployment.stackName,
                type: StageType.INFRA,
                overrideStackValue: async (state: Deployment) => {
                    await this.overrideConnexionStateValue(state)
                },
                run: async () => {
                    const provider = this.configDeployment.provider()

                    const image = new Docker.RemoteImage(this.config.image, {
                        name: `${this.config.image}:${this.config.version}`
                    }, { provider })

                    const labels: Input<Input<ContainerLabel>[]> = [{
                        label: "com.docker.compose.project",
                        value: `${this.configDeployment.projectName}-${this.configDeployment.stackName}`
                    }]
                    const networks: Input<ContainerNetworksAdvanced>[] = []
                    const environmentVars: Input<string>[] = this.config.vars.map(value => `${value.key}=${value.value}`.replace("{{url}}", `${!this.configDeployment.isProd ? `${this.configDeployment.stackName}.` : ''}${this.configDeployment.domain}`)
                        .replace("{{environment}}", this.configDeployment.stackName))

                    if(this.config.exposedPort) {
                        const domain = `${this.config.externalDomainPrefix ? `${this.config.externalDomainPrefix}.` : ''}${!this.configDeployment.isProd ? `${this.configDeployment.stackName}.` : ''}${this.configDeployment.domain}`
                        const traefikPlugin = TraefikPlugin.getPlugin({ kind: 'traefik'}, this.configDeployment)
                        const rules = await traefikPlugin.getConnexion({
                            kind: 'traefik',
                            port: this.config.exposedPort,
                            domain: domain,
                            identifier: `${this.configDeployment.projectName}-${this.configDeployment.stackName}-${this.config.name}`
                        })
                        if(rules.labels && rules.networks) {
                            labels.push(...rules.labels)
                            networks.push(...rules.networks.map(value => ({name: value})))
                        } else {
                            throw new Error('no labels or network in traefik plugin connexion')
                        }
                    }

                    const pluginInfo = await getPluginsConnexion(this.config, this.configDeployment)

                    environmentVars.push(...pluginInfo.envs)
                    networks.push(...pluginInfo.networks.map(value => ({name: value})))
                    labels.push(...(pluginInfo.labels || []))

                    new Docker.Container(`${this.configDeployment.projectName}-${this.configDeployment.stackName}-${this.config.name}`, {
                        name: `${this.configDeployment.projectName}-${this.configDeployment.stackName}-${this.config.name}`,
                        image: image.imageId,
                        restart: 'always',
                        volumes: this.config.volumes,
                        labels: labels,
                        networksAdvanced: networks,
                        envs: environmentVars,
                    }, { provider })
                }
            }
        ]
    }

    getConnexionKindNames(): [] {
        return [];
    }

    async overrideConnexionStateValue(state: Deployment): Promise<void> {
        for (const plugin of this.dependencies) {
            await plugin.overrideConnexionStateValue(state)
        }
    }

    async getConnexion(): Promise<ConnexionSetting> {
        return {
            labels: [],
            networks: [],
            envs: []
        }
    }
}
