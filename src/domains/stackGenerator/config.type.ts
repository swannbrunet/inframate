import { Resource } from "@pulumi/pulumi";
import { secretManager } from "../secretManager/index.js";
import { ProjectSetting } from "../projectStackType/projectSetting.type.js";

export interface ConfigDeployement {
    stackName: string,
    projectName: string,
    isProd: boolean,
    domain: string,
    secretManager: secretManager,
    contextRessource: ProjectSetting,
}

export interface ResourceToDeploy {
    [id: string]: Resource | undefined
}