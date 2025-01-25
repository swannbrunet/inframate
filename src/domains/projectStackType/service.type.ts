import { InstanceSize } from "./instanceSize.type";
import { Plugin } from "./plugin.type";

type VarTypes = {
    key: string,
    value: string // for include generated value : {{value}} -> value : "url" |  "volumeName" | "environment"
}

export interface Service {
    image: string,
    version: string,
    name: string,
    externalDomainPrefix?: string,
    exposedPort?: string,
    size: InstanceSize,
    prodSize?: InstanceSize,
    vars: VarTypes[],
    plugins : Plugin[],
    volumes: {
        containerPath: string,
        volumeName: string, 
    }[] 
}