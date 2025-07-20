import { InstanceSize } from "./instanceSize.type.ts";
import type { Plugin } from "./pluginConnexion.type.ts";

type VarTypes = {
    key: string,
    value: string // for include generated value : {{value}} -> value : "url" |  "volumeName" | "environment"
}

export interface Service {
    image: string | {
        context: string
        dockerfile: string
    },
    version: string,
    name: string,
    externalDomainPrefix?: string,
    exposedPort?: number,
    size: InstanceSize,
    prodSize?: InstanceSize,
    vars: VarTypes[],
    plugins : Plugin[],
    volumes: {
        containerPath: string,
        volumeName: string,
    }[]
}

export const VAR_URL = "{{url}}"
export const VAR_ENVIRONMENT = "{{environment}}"
export function SECRET (key: string): string {
    return `{{secret:${key}}`
}