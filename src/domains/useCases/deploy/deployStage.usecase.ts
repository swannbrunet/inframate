import * as pulumi from "@pulumi/pulumi/automation/index.js";
import chalk from "chalk";
import {type Stage, StageMode, StageType} from "../../stackGenerator/plugins/abstract.plugin.ts";

export async function deployStage(stage: Stage): Promise<void> {
    if(stage.type === StageType.COMMAND) {
        return deployCommand(stage);
    }
    const workspace = await pulumi.LocalWorkspace.create({
        projectSettings: {
            name: stage.project,
            runtime: "nodejs"
        },
        program: () => stage.run(StageMode.DEPLOY)
    });

    const stack = await pulumi.Stack.createOrSelect(stage.stack, workspace);
    if(stage.overrideStackValue) {
        const state = await stack.exportStack()
        await stage.overrideStackValue(state)
        await stack.importStack(state)
    }
    await stack.refresh();
    await stack.up({ logFlow: true });

    console.log(chalk.yellow("[INFO] - "), `Deployment ${stage.project}-${stage.stack} complete.`)
}

function deployCommand(stage: Stage): Promise<void> {
    return new Promise((resolve, reject) => {
        stage.run(StageMode.DEPLOY).then(() => {
            console.log(chalk.yellow("[INFO] - "), `Command ${stage.project}-${stage.stack} complete.`)
            resolve();
        }).catch((error) => {
            console.error(chalk.red("[ERROR] - "), `Error deploying command ${stage.project}-${stage.stack}: ${error}`);
            reject(error);
        });
    });
}
