import {getProjectConfig} from "../getProjectConfig.usecase.ts";
import chalk from "chalk";
import {UpdateHostFileUsecase} from "../updateHostFile.usecase.ts";
import {Project} from "../../stackGenerator/project.ts";

const updateHostFileUsecase = new UpdateHostFileUsecase()

export async function displayAnInfrastructure(projectName: string, stackName: string, projectURL: string) {

    const projectConfig = await getProjectConfig(projectURL, stackName)

    const project = new Project(projectConfig, projectName, stackName)

    const projectDisplay = project.getDependencyGraph()

    console.log(chalk.green(`[INFO] - ${projectDisplay.length} ressources`))

    projectDisplay.forEach((dep, i) => {
        console.log(chalk.green`----------------------------`)
        console.log(dep)
    })
}
