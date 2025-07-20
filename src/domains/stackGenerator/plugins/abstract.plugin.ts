import {Output} from "@pulumi/pulumi";
import * as Docker from "@pulumi/docker";
import type {ConfigDeployement} from "../config.type.ts";
import type {Deployment} from "@pulumi/pulumi/automation";

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
    public readonly abstract identifier: string;
    abstract readonly type: string;
    dependencies: AbstractPlugin[] = [];
    clusterName: string = "";

    constructor(
        protected config: AbstractPluginConfig,
        protected configDeployment: ConfigDeployement) {

    }

    abstract getDeploymentPlan(): DeploymentPlan;

    abstract getConnexion(setting: any): Promise<ConnexionSetting>;

    getInfo(): any {
        return {}
    }

    async overrideConnexionStateValue(state: Deployment): Promise<void> {
    }

    getLabel(): string {
        return 'no label'
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
