import { ProjectSetting } from "../projectStackType/projectSetting.type.js";
import { secretManager } from "../secretManager/index.js";
import { generateService } from "./computes/service.stack.js";
import { ConfigDeployement } from "./config.type.js";
import * as Docker from "@pulumi/docker";


export async function generateStack(projectSetting: ProjectSetting,  projectName: string, stackName: string) {
    const resourceToDeploy = {}
    const isProd = projectSetting.prodBranch === stackName
    const config: ConfigDeployement = {
        stackName,
        projectName,
        isProd: isProd,
        domain: isProd ? projectSetting.externalDomain : `${projectSetting.externalDomain}.local`,
        secretManager: new secretManager(),
        contextRessource: projectSetting
    } 

    const provider = new Docker.Provider("docker-provider", {})

    for (let i = 0; i < projectSetting.services.length; i++) {
        await generateService(projectSetting.services[i], config, provider, resourceToDeploy)
    }
    return resourceToDeploy
}