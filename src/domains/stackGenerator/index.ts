import { ProjectSetting } from "../projectStackType/projectSetting.type";
import { secretManager } from "../secretManager";
import { generateService } from "./computes/service.stack";
import { ConfigDeployement } from "./config.type";
import * as Docker from "@pulumi/docker";


export async function generateStack(projectSetting: ProjectSetting,  projectName: string, stackName: string) {
    const resourceToDeploy = {}
    const config: ConfigDeployement = {
        stackName,
        projectName,
        isProd: projectSetting.prodBranch === stackName,
        externalDomain: projectSetting.externalDomain,
        secretManager: new secretManager(),
        contextRessource: projectSetting
    } 

    const provider = new Docker.Provider("docker-provider", {})

    for (let i = 0; i < projectSetting.services.length; i++) {
        await generateService(projectSetting.services[i], config, provider, resourceToDeploy)
    }
    return resourceToDeploy
}