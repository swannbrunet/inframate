import { Resource } from "@pulumi/pulumi";
import { secretManager } from "../secretManager";
import { ProjectSetting } from "../projectStackType/projectSetting.type";

export interface ConfigDeployement {
    stackName: string,
    projectName: string,
    isProd: boolean,
    externalDomain: string,
    secretManager: secretManager,
    contextRessource: ProjectSetting,
}

export interface ResourceToDeploy {
    [id: string]: Resource | undefined
}