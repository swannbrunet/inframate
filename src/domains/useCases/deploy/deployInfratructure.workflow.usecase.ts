import {getProjectConfig} from "../getProjectConfig.usecase.ts";
import chalk from "chalk";
import {UpdateHostFileUsecase} from "../updateHostFile.usecase.ts";
import {Project} from "../../stackGenerator/project.ts";
import {deployStepUsecase} from "./deployStep.usecase.ts";
import {destroyStage} from "../destroy/destroyStage.usecase.ts";

const updateHostFileUsecase = new UpdateHostFileUsecase()

export async function deployAnInfrastructure(projectName: string, stackName: string, projectURL: string) {

    const projectConfig = await getProjectConfig(projectURL, stackName)

    const project = new Project(projectConfig, projectName, stackName)

    const projectLengthSteps = project.getDeploymentSteps()

    console.log(chalk.green`[INFO] - ${projectLengthSteps} steps to deploy`)

    try {
        for (let i = 0; i < projectLengthSteps; i++) {
            console.log(chalk.green`[INFO] - Step ${i + 1}`)
            await deployStepUsecase(project.getDeploymentStep(i))
        }
    } catch (e) {
        console.log(chalk.red`[ERROR] - clean temporary config ressource`)
        await Promise.all(project.getTemporaryStages().map(async stage => destroyStage(stage)))
        throw e;
    }
    console.log(chalk.green('[STEP 2] - Destroy temporary config ressource'))
    await Promise.all(project.getTemporaryStages().map(async stage => destroyStage(stage)))

    console.log(chalk.green('[STEP 3] - set hostfile'))
    updateHostFileUsecase.execute(`${projectName}-${stackName}`, project.getExternalDomain().map(domain => domain.domain))

}
