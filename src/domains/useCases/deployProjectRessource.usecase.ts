import * as pulumi from "@pulumi/pulumi/automation/index.js";
import { generateStack } from "../stackGenerator/index.js";
import { ProjectSetting } from "../projectStackType/projectSetting.type.js";

export async function deployProjectRessource(projectName: string, stackName: string, projectConfig: ProjectSetting) {
    const workspace = await pulumi.LocalWorkspace.create({
        projectSettings: {
            name: projectName,
            runtime: "nodejs"
        },
        program: async () => {
            return await generateStack(projectConfig, projectName, stackName)
        }
    });

    const stack = await pulumi.Stack.createOrSelect(stackName, workspace);

    console.log(`Stack "${stackName}" loaded`);

    console.log("Applying stack...");
    await stack.refresh();
    await stack.up({ logFlow: true });

    console.log("Deployment complete.");
}