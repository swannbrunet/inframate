import { deployProjectRessource } from "./deployProjectRessource.usecase.js";
import { DeployRequirementModules } from "./deployRequirementModules.usecase.js";
import { getProjectConfig } from "./getProjectConfig.usecase.js";
import chalk from "chalk";

const deployRequirementModules = new DeployRequirementModules()

export async function deployAnInfrastructure(projectName: string, stackName: string, projectURL: string) {
    
    const projectConfig = await getProjectConfig(projectURL, stackName)

   console.log(chalk.green('[STEP 1] - Setup docker landing zone ( requirement module )'))
   await deployRequirementModules.execute()

   console.log(chalk.green('[STEP 2] - Deploy cross environment ressource'))
   console.log(chalk.red('Warn  - not supported yet'))

   console.log(chalk.green('[STEP 3] - Deploy environement'))
   const project = await getProjectConfig(projectURL, stackName)
   await deployProjectRessource(projectName, stackName, project)
}