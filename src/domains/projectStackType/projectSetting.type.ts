import { Service } from "./service.type.js";
import { Plugin } from "./plugin.type.js";

export interface ProjectSetting {
    externalDomain: string,
    prodBranch: string,
    services: Service[]
    plugins: Plugin[]
}
