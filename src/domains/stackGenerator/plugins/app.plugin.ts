import {AbstractPlugin, type ConnexionSetting, type DeploymentPlan, StageType} from "./abstract.plugin.ts";
import type {ConfigDeployement} from "../config.type.ts";
import type {AppConfigPlugin} from "../../projectStackType/plugin.type.ts";
import * as Docker from "@pulumi/docker";
import Pulumi, {type Input} from "@pulumi/pulumi";
import type {Service} from "../../projectStackType/service.type.ts";
import type {ContainerLabel, ContainerNetworksAdvanced} from "@pulumi/docker/types/input.ts";
import {TraefikPlugin} from "./traefik.plugin.ts";
import {getPluginsConnexion} from "../connexions/index.ts";
import {getPluginFromConnexionKind} from "./index.ts";
import type {Deployment} from "@pulumi/pulumi/automation";

export class AppPlugin extends AbstractPlugin {
    static kind = "app";
    static VAR_URL = "{{url}}"
    static VAR_ENVIRONMENT = "{{environment}}"
    static SECRET (key: string): string {
        return `{{secret:${key}}`
    }

    declare config: AppConfigPlugin;
    public readonly type: string = AppPlugin.name;
    public readonly identifier: string;
    private readonly user: string = 'user';
    private projectName: string;
    private readonly domain: string;

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
        this.domain = this.config.exposedPort ? `${this.config.externalDomainPrefix ? `${this.config.externalDomainPrefix}.` : ''}${!this.configDeployment.isProd ? `${this.configDeployment.stackName}.` : ''}${this.configDeployment.domain}` : this.identifier
    }

    getLabel(): string {
        return this.config.name;
    }

    getInfo(): any {
        return this.config
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

                    const image = this.getImage()

                    const labels: Input<Input<ContainerLabel>[]> = [{
                        label: "com.docker.compose.project",
                        value: `${this.configDeployment.projectName}-${this.configDeployment.stackName}`
                    }]
                    const networks: Input<ContainerNetworksAdvanced>[] = []
                    const environmentVars: Input<string>[] = this.config.vars.map(value => {
                        const envVar = `${value.key}=${value.value}`
                            .replace("{{url}}", `${this.domain}`)
                            .replace("{{environment}}", this.configDeployment.stackName)
                        return this.setSecretEnv(envVar);
                    })


                    if(this.config.exposedPort) {
                        const traefikPlugin = TraefikPlugin.getPlugin({ kind: 'traefik'}, this.configDeployment)
                        const rules = await traefikPlugin.getConnexion({
                            kind: 'traefik',
                            port: this.config.exposedPort,
                            domain: this.domain,
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

    private async setSecretEnv(value: string): Promise<string> {
        if (value.includes('{{secret:')) {
            const start = value.indexOf('{{secret:')
            const end = value.indexOf('}}')
            const key = value.substring(start + 9, end - 2)
            const secretValue = await this.configDeployment.secretManager.getOrCreateSecret(key)
            return value.replace(/\{\{secret:([^}]+)\}\}/g, secretValue)
        }
        return value
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

    private getImage() {
        const provider = this.configDeployment.provider()
        if(typeof this.config.image === "string") {
            return new Docker.RemoteImage(this.config.image, {
                name: `${this.config.image}:${this.config.version}`
            }, { provider })
        }
        const image =  new Docker.Image(this.config.name, {
            imageName: this.config.name,
            build: {
                context: this.config.image.context,
                dockerfile: this.config.image.dockerfile
            }
        })

        return {
            ...image,
            imageId : image.repoDigest
        }
    }
}
