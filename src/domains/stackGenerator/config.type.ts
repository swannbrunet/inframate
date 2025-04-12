import { secretManager } from "../secretManager/index.js";
import { ProjectSetting } from "../projectStackType/projectSetting.type.js";
import { AbstractPlugin } from "./plugins/abstract.plugin.js";
import * as Docker from "@pulumi/docker";

export interface ConfigDeployement {
    stackName: string,
    projectName: string,
    isProd: boolean,
    domain: string,
    secretManager: secretManager,
    contextRessource: ProjectSetting,
    resources: ResourceToDeploy,
    provider: () => Docker.Provider,
}

export interface ResourceToDeploy {
    externalDomain: {service: string, domain: string}[]
    resources: {
        [id: string]: AbstractPlugin | undefined
    }

}
