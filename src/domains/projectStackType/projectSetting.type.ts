import { GlobalPluginConfig } from "./globalPlugin.type";
import { Service } from "./service.type";

export interface ProjectSetting {
    externalDomain: string,
    prodBranch: string,
    services: Service[]
    //globalPluginConfig: GlobalPluginConfig[]
}