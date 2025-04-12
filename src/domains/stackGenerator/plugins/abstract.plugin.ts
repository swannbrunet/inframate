import {Output} from "@pulumi/pulumi";
import * as Docker from "@pulumi/docker";
import { ConfigDeployement } from "../config.type.js";
import {Deployment} from "@pulumi/pulumi/automation";

export interface AbstractPluginConfig {
    kind: string,
}

export interface AbstractConnexion {
    kind: string;
}

export abstract class AbstractPlugin {
    abstract getConnexionKindNames(): string[];
    static getPlugin(_config: AbstractPluginConfig,
                     _configDeployment: ConfigDeployement): AbstractPlugin {
        throw new Error("Method not implemented for plugin " + this.kind);
    }
    static kind = "abstract";
    dependencies: AbstractPlugin[] = [];
    clusterName: string = "";

    constructor(
        protected config: AbstractPluginConfig,
        protected configDeployment: ConfigDeployement) {

    }

    abstract getDeploymentPlan(): DeploymentPlan {
        return [];
    }

    abstract getConnexion(setting: any): Promise<ConnexionSetting>;

    async overrideConnexionStateValue(state: Deployment): Promise<void> {
    }
}

export interface ConnexionSetting {
    envs?: (string | Output<string>)[]
    networks?: (string | Output<string>)[]
    labels?: {
        label :(string | Output<string>)
        value: (string | Output<string>)
    }[]
}

export type PluginFactory<T extends AbstractPluginConfig> = (config: T, provider: Docker.Provider, configDeployment: ConfigDeployement) => AbstractPlugin;

export type DeploymentPlan = Stage[]

export enum StageMode {
    DEPLOY,
    DESTROY,
}

export enum StageType {
    INFRA,
    COMMAND,
}

export interface Stage {
    project: string,
    stack: string,
    type: StageType,
    run: (mode: StageMode) => Promise<any>,
    overrideStackValue?: (stack: any) => Promise<void>,
    temporary: boolean,
}
