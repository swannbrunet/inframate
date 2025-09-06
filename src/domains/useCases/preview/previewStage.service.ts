import {type Stage, StageMode, StageType} from "../../stackGenerator/plugins/abstract.plugin.ts";
import * as pulumi from "@pulumi/pulumi/automation/index.js";
import chalk from "chalk";

export async function previewStageService(stage: Stage) {
    if(stage.type === StageType.COMMAND) {
        console.log(chalk.red("[ERROR] - a command stage cannot be preview"))
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
        try {
            const state = await stack.exportStack()
            await stage.overrideStackValue(state)
            await stack.importStack(state)
        } catch {}
    }
    try {
        await stack.preview({ diff: true }).then(result => {
            console.log(result.stdout)
        });
    } catch (e: any) {
        console.error(chalk.red("[ERROR] - "), `Deployment ${stage.project}-${stage.stack} failed.`)
        throw e; // TODO : clean output
    }

    console.log(chalk.yellow("[INFO] - "), `Deployment ${stage.project}-${stage.stack} complete.`)
}