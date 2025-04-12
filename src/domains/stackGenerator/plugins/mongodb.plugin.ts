import {AbstractPlugin, ConnexionSetting, DeploymentPlan, StageType} from "./abstract.plugin.js";
import {ConfigDeployement} from "../config.type.js";
import * as docker from "@pulumi/docker";
import {MongoDBConfigPlugin, TypesenseConfigPlugin} from "../../projectStackType/plugin.type.js";
import * as Docker from "@pulumi/docker";
import {MongoDBConnexion} from "../../projectStackType/pluginConnexion.type.js";
import Pulumi from "@pulumi/pulumi";

export class MongodbPlugin extends AbstractPlugin {
    static kind = "mongoDB";

    declare config: TypesenseConfigPlugin;
    public readonly type: string = MongodbPlugin.name;
    private instance?: Docker.Container;
    private network?: Docker.Network;
    private volume?: Docker.Volume;
    private readonly identifier: string;
    private readonly user: string = 'user';
    private password?: string;
    private projectName: string;

    constructor(config: MongoDBConfigPlugin, configDeployment: ConfigDeployement) {
        super(config, configDeployment);
        this.identifier = `${configDeployment.projectName}-${configDeployment.stackName}-mongodb-${config.clusterName}`;
        this.projectName = `${configDeployment.projectName}-mongodb-${config.clusterName}`;
        this.clusterName = config.clusterName
    }


    getDeploymentPlan(): DeploymentPlan {
        return [
            {
                temporary: false,
                project: `${this.projectName}-step1`,
                stack: this.configDeployment.stackName,
                type: StageType.INFRA,
                run: async () => {
                    const provider = this.configDeployment.provider()
                    this.password = await this.configDeployment.secretManager.getOrCreateSecret(`${this.identifier}-password`)

                    this.network = new Docker.Network(`${this.identifier}-network`, {
                        name: `${this.identifier}-network`
                    }, { provider })
                    this.volume = new Docker.Volume(`${this.identifier}-volume`, {
                        name: `${this.identifier}-volume`
                    }, { provider })

                    this.instance = new Docker.Container(this.identifier, {
                        image: "mongo:7.0.16",
                        name: this.identifier,
                        restart: 'always',
                        envs: [
                            `MONGO_INITDB_ROOT_USERNAME=${this.user}`,
                            `MONGO_INITDB_ROOT_PASSWORD=${this.password}`,
                        ],
                        labels: [
                            {
                                label: "com.docker.compose.project",
                                value: `${this.configDeployment.projectName}-${this.configDeployment.stackName}`
                            }
                        ],
                        networksAdvanced: [
                            {
                                name: this.network.name
                            }
                        ],
                        volumes: [
                            {
                                containerPath: "/data",
                                volumeName: this.volume.name
                            }
                        ]
                    }, { provider, dependsOn: [this.network] })
                }
            }
        ]
    }

    getConnexionKindNames(): ['mongoDB'] {
        return ['mongoDB'];
    }

    async getConnexion(setting: MongoDBConnexion): Promise<ConnexionSetting> {
        if(!this.instance || !this.network) {
            throw new Error('The plugin is not initialized')
        }
        return {
            envs: [
                Pulumi.interpolate`${setting.exportedEnvMapping.uri}=mongodb://${this.user}:${this.password}@${this.instance.name}:27017`
            ],
            networks: [this.network.name]
        }
    }

    static getPlugin(config: MongoDBConfigPlugin,
                     configDeployment: ConfigDeployement): MongodbPlugin {
        const identifier = `${configDeployment.projectName}-${configDeployment.stackName}-mongodb-${config.clusterName}`
        if(configDeployment.resources.resources[identifier]) {
            return configDeployment.resources.resources[identifier] as MongodbPlugin;
        } else {
            const plugin = new MongodbPlugin(config as MongoDBConfigPlugin, configDeployment);
            configDeployment.resources.resources[plugin.identifier] = plugin;
            return plugin;
        }
    }
}
