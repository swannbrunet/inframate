import { Service } from "./service.type.js";

export interface ProjectSetting {
    externalDomain: string,
    prodBranch: string,
    services: Service[]
    //globalPluginConfig: GlobalPluginConfig[]
}