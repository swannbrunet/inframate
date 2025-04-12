import { ProjectSetting } from "../projectStackType/projectSetting.type.js"
import { secretManager } from "../secretManager/index.js"
import {ConfigDeployement, ResourceToDeploy } from "./config.type.js"
import * as Docker from "@pulumi/docker"
import {AbstractPlugin, DeploymentPlan, Stage} from "./plugins/abstract.plugin.js"
import {getPluginFromKind, plugins} from "./plugins/index.js"
import { TraefikPlugin } from "./plugins/traefik.plugin.js"
import { ServiceConnexionPlugin } from "./plugins/serviceConnexion.plugin.js"
import { generateService } from "./computes/service.stack.js"
import {AppPlugin} from "./plugins/app.plugin.js";

export class Project {
    private services: any[] = []
    private plugins: AbstractPlugin[] = []
    private configDeployement: ConfigDeployement;
    private isProd: boolean;
    private projectDeploymentPlan: AbstractPlugin[][] = []
    private temporaryStage: Stage[] = []

    constructor(private projectSetting: ProjectSetting, projectName: string, stackName: string) {
        const resourceToDeploy: ResourceToDeploy = {
            externalDomain: [],
            resources: {}
        }
        this.isProd = projectSetting.prodBranch === stackName
        this.configDeployement = {
            stackName,
            projectName,
            isProd: this.isProd,
            domain: this.isProd ? projectSetting.externalDomain : `${projectSetting.externalDomain}.dev.local`,
            secretManager: new secretManager(),
            contextRessource: projectSetting,
            resources: resourceToDeploy,
            provider: () => new Docker.Provider(`docker-provider`, {})
        }

        this.initRiqueredPlugins()
        projectSetting.plugins.forEach(pluginConfig => {
            const Plugin = getPluginFromKind(pluginConfig.kind)
            Plugin.getPlugin(pluginConfig, this.configDeployement)
        })
        Object.values(this.configDeployement.resources.resources).forEach(resource => {
            if(resource) {
                this.plugins.push(resource)
            }
        })
        projectSetting.services.forEach(service => {
            this.plugins.push(new AppPlugin(service, this.configDeployement))
        })
        this.generateDeploymentPlan()
        this.collectTemporaryStages()
    }

    private initRiqueredPlugins() {
        TraefikPlugin.getPlugin({
            kind: 'traefik',
        }, this.configDeployement)
        ServiceConnexionPlugin.getPlugin({
            kind: 'serviceConnexion',
        }, this.configDeployement)
    }

    private generateDeploymentPlan() {
        const pluginInserted: AbstractPlugin[] = []
        let iteration = 0
        while (pluginInserted.length < this.plugins.length) {
            iteration++
            if(iteration > 10) {
                throw new Error('To many dependencies steps ( more than 10 )')
            }
            const step = []
            this.plugins.forEach(plugin => {
                if (!pluginInserted.includes(plugin) && plugin.dependencies.every(dep => pluginInserted.includes(dep))) {
                    step.push(plugin)
                }
            })
            pluginInserted.push(...step)
            this.projectDeploymentPlan.push(step)
        }
    }

    private collectTemporaryStages() {
        this.plugins.forEach(plugin => {
            const deployment = plugin.getDeploymentPlan()
            deployment.forEach(stage => {
                if(stage.temporary) {
                    this.temporaryStage.push(stage)
                }
            })
        })
    }

    getDeploymentSteps(): number {
        return this.projectDeploymentPlan.length
    }

    getDeploymentStep(step: number): DeploymentPlan[] {
        return this.projectDeploymentPlan[step].map(plugin => plugin.getDeploymentPlan());
    }

    getExternalDomain() {
        return this.configDeployement.resources.externalDomain
    }

    getTemporaryStages() {
        return this.temporaryStage
    }
}
