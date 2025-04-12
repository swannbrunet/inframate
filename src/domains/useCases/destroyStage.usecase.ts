import * as pulumi from "@pulumi/pulumi/automation/index.js";
import chalk from "chalk";
import {Stage, StageMode, StageType} from "../stackGenerator/plugins/abstract.plugin.js";

export async function destroyStage(stage: Stage): Promise<void> {
    if(stage.type === StageType.COMMAND) {
        return destroyCommand(stage);
    }
    const workspace = await pulumi.LocalWorkspace.create({
        projectSettings: {
            name: stage.project,
            runtime: "nodejs"
        },
        program: () => stage.run(StageMode.DESTROY)
    });

    const stack = await pulumi.Stack.createOrSelect(stage.stack, workspace);

    console.log(`Stack "${stage.stack}" loaded`);

    console.log("Applying stack...");
    await stack.refresh();
    await stack.destroy({ logFlow: true });

    console.log(chalk.yellow("[INFO] - "), `${stage.project}-${stage.stack} destroy complete.`)
}

export async function destroyCommand(stage: Stage): Promise<void> {
    return stage.run(StageMode.DESTROY).then(() => {
            console.log(chalk.yellow("[INFO] - "), `Command ${stage.project}-${stage.stack} complete.`)
        }).catch((error) => {
            console.error(chalk.red("[ERROR] - "), `Error deploying command ${stage.project}-${stage.stack}: ${error}`);
            throw error;
        });
}
