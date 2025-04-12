import {getProjectConfig} from "./getProjectConfig.usecase.js";
import chalk from "chalk";
import {UpdateHostFileUsecase} from "./updateHostFile.usecase.js";
import {Project} from "../stackGenerator/project.js";
import {deployStepUsecase} from "./deployStep.usecase.js";
import {deployStage} from "./deployStage.usecase.js";
import {destroyStage} from "./destroyStage.usecase.js";

const updateHostFileUsecase = new UpdateHostFileUsecase()

export async function destroyAnInfrastructure(projectName: string, stackName: string, projectURL: string) {

    const projectConfig = await getProjectConfig(projectURL, stackName)

    const project = new Project(projectConfig, projectName, stackName)

    const projectLengthSteps = project.getDeploymentSteps()

    console.log(chalk.green`[INFO] - ${projectLengthSteps} steps to deploy`)

    for (let i = 0; i < projectLengthSteps; i++) {
        console.log(chalk.green`[INFO] - Step ${i + 1}`)
        await deployStepUsecase(project.getDeploymentStep(i))
    }
    console.log(chalk.green`[STEP 2] - Destroy tempoary config ressource`)
    await Promise.all(project.getTemporaryStages().map(async stage => destroyStage(stage)))

    console.log(chalk.green`[STEP 3] - set hostfile and certificate`)
    updateHostFileUsecase.execute(`${projectName}-${stackName}`, project.getExternalDomain().map(domain => domain.domain))

}
