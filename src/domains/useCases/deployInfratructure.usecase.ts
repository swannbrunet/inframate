import * as pulumi from "@pulumi/pulumi/automation";
import { generateStack } from "../stackGenerator";
import { getProjectConfig } from "./getProjectConfig.usecase";

export async function deployAnInfrastructure(projectName: string, stackName: string, projectURL: string) {
    
    const projectConfig = await getProjectConfig(projectURL, stackName)

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