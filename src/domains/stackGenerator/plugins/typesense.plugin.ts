import {TypesenseConfigPlugin} from "../../projectStackType/plugin.type.js";
import {AbstractPlugin, ConnexionSetting, DeploymentPlan, StageType} from "./abstract.plugin.js";
import * as Docker from "@pulumi/docker";
import {ConfigDeployement} from "../config.type.js";
import {TypesenseConnexion} from "../../projectStackType/pluginConnexion.type.js";
import Pulumi from "@pulumi/pulumi";

export class TypesensePlugin extends AbstractPlugin{
    static kind = "typesense";
    declare config: TypesenseConfigPlugin;
    public readonly type: string = TypesensePlugin.name;
    private instance?: Docker.Container;
    private network?: Docker.Network;
    private volume?: Docker.Volume;
    private readonly identifier: string;
    private apiKey?: string;
    private projectName: string;

    constructor(config: TypesenseConfigPlugin, configDeployement: ConfigDeployement) {
        super(config, configDeployement);
        this.identifier = `${configDeployement.projectName}-${configDeployement.stackName}-typesense-${config.clusterName}`;
        this.projectName = `${configDeployement.projectName}-typesense-${config.clusterName}`;
        this.clusterName = config.clusterName
    }

    private async generateInstance() {
        const provider = this.configDeployment.provider();
        this.apiKey = await this.configDeployment.secretManager.getOrCreateSecret(`${this.identifier}-api-key`)
        this.network = new Docker.Network(`network-${this.identifier}`, {
            name: `network-${this.identifier}`
        }, {provider});
        this.volume = new Docker.Volume(`volume-${this.identifier}`, {
            name: `volume-${this.identifier}`
        }, {provider});
        this.instance = new Docker.Container(`container-${this.identifier}`, {
            image: "typesense/typesense:28.0",
            name: this.identifier,
            networksAdvanced: [{
                name: this.network.name
            }],
            volumes: [{
                containerPath: "/data",
                volumeName: this.volume.name
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


    getName(): string {
        return this.config.clusterName;
    }

    getConnexionKindNames(): string[] {
        return ["typesense"];
    }

    async getConnexion(setting: TypesenseConnexion): Promise<ConnexionSetting> {
        if (this.instance === undefined || this.network === undefined) {
            throw new Error("Instance not created yet");
        }
        return {
            envs: [
                Pulumi.interpolate`${setting.exportedEnvMapping.host}=${this.instance.name}`,
                `${setting.exportedEnvMapping.port}=8108}`,
                `${setting.exportedEnvMapping.protocol}=http`,
                `${setting.exportedEnvMapping.apiKey}=${this.apiKey}`
            ],
            networks: [this.network.name]
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
