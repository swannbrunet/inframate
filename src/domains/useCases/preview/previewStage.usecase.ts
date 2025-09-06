import {getProjectConfig} from "../getProjectConfig.usecase.ts";
import {Project} from "../../stackGenerator/project.ts";
import {previewStageService} from "./previewStage.service.ts";

export async function previewStageUsecase(projectName: string, stackName: string, projectURL: string, stageName: string) {
    const projectConfig = await getProjectConfig(projectURL, stackName)

    const project = new Project(projectConfig, projectName, stackName)


    const stage = project.getStage(stageName)

    if(stage) {
        await previewStageService(stage)
    } else {
        console.log("stage not found")
        console.log(project.listStage())
    }
}