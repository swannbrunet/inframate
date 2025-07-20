import type {Service} from "./service.type.ts";
import type {Plugin} from "./plugin.type.ts";

export interface ProjectSetting {
    externalDomain: string,
    prodBranch: string,
    services: Service[]
    plugins: Plugin[]
}
