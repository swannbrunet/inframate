import type {Service} from "../../projectStackType/service.type.ts";
import * as Docker from "@pulumi/docker";
import type {ConfigDeployement} from "../config.type.ts";
import type {Input} from "@pulumi/pulumi";
import type {ContainerLabel, ContainerNetworksAdvanced} from "@pulumi/docker/types/input.ts";
import { getPluginsConnexion } from "../connexions/index.ts";
import { TraefikPlugin } from "../plugins/traefik.plugin.ts";

export async function generateService(service: Service, config: ConfigDeployement) {
    throw 'DEPRECATED'
}
