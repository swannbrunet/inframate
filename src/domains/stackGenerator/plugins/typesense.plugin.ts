import type {TypesenseConfigPlugin} from "../../projectStackType/plugin.type.ts";
import {AbstractPlugin, type ConnexionSetting, type DeploymentPlan, StageType} from "./abstract.plugin.ts";
import * as Docker from "@pulumi/docker";
import type {ConfigDeployement} from "../config.type.ts";
import type {TypesenseConnexion} from "../../projectStackType/pluginConnexion.type.ts";
import Pulumi from "@pulumi/pulumi";

export class TypesensePlugin extends AbstractPlugin{
    static kind = "typesense";
    declare config: TypesenseConfigPlugin;
    public readonly type: string = TypesensePlugin.name;
    public readonly identifier: string;
    private apiKey?: string;
    private projectName: string;
    private networkName: string;

    constructor(config: TypesenseConfigPlugin, configDeployement: ConfigDeployement) {
        super(config, configDeployement);
        this.identifier = `${configDeployement.projectName}-${configDeployement.stackName}-typesense-${config.clusterName}`;
        this.projectName = `${configDeployement.projectName}-typesense-${config.clusterName}`;
        this.clusterName = config.clusterName
        this.networkName = `network-${this.identifier}`
    }

    private async generateInstance() {
        const provider = this.configDeployment.provider();
        this.apiKey = await this.configDeployment.secretManager.getOrCreateSecret(`${this.identifier}-api-key`)
        const network = new Docker.Network(this.networkName, {
            name: this.networkName
        }, {provider});
        const volume = new Docker.Volume(`volume-${this.identifier}`, {
            name: `volume-${this.identifier}`
        }, {provider});
        const instance = new Docker.Container(`container-${this.identifier}`, {
            image: "typesense/typesense:28.0",
            name: this.identifier,
            networksAdvanced: [{
                name: network.name
            }],
            volumes: [{
                containerPath: "/data",
                volumeName: volume.name
            }],
            envs: [
                `TYPESENSE_API_KEY=${this.apiKey}`,
                `TYPESENSE_DATA_DIR=/data`
            ],
            labels: [{
                label: "com.docker.compose.project",
                value: `${this.configDeployment.projectName}-${this.configDeployment.stackName}`
            }]
        }, {provider});
    }

    getDeploymentPlan(): DeploymentPlan {

        return [
            {
                temporary: false,
                project: `${this.projectName}-step1`,
                stack: this.configDeployment.stackName,
                type: StageType.INFRA,
                run: async () => {
                    await this.generateInstance()
                }
            }
        ]
    }


    getLabel(): string {
        return this.config.clusterName;
    }

    getConnexionKindNames(): string[] {
        return ["typesense"];
    }

    async getConnexion(setting: TypesenseConnexion): Promise<ConnexionSetting> {
        return {
            envs: [
                Pulumi.interpolate`${setting.exportedEnvMapping.host}=${this.identifier}`,
                `${setting.exportedEnvMapping.port}=8108}`,
                `${setting.exportedEnvMapping.protocol}=http`,
                `${setting.exportedEnvMapping.apiKey}=${this.apiKey}`
            ],
            networks: [this.networkName]
        }
    }

    static getPlugin(config: TypesenseConfigPlugin, configDeployement: ConfigDeployement): TypesensePlugin {
        const identifier = `${configDeployement.projectName}-${configDeployement.stackName}-typesense-${config.clusterName}`;
        if(configDeployement.resources.resources[identifier]) {
            return configDeployement.resources.resources[identifier] as TypesensePlugin;
        } else {
            const plugin = new TypesensePlugin(config, configDeployement);
            configDeployement.resources.resources[identifier] = plugin;
            return plugin;
        }
    }
}
