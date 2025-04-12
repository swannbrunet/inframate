import {DeploymentPlan} from "../stackGenerator/plugins/abstract.plugin.js";
import {deployStage} from "./deployStage.usecase.js";

export async function deployStepUsecase(deploymentPlans: DeploymentPlan[]): Promise<void> {
    const result = deploymentPlans.map(async (deploymentPlan) => {
        for (let i = 0; i < deploymentPlan.length; i++) {
            await deployStage(deploymentPlan[i]);
        }
    });
    await Promise.all(result);
}
