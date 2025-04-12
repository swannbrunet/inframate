
import { KeycloakPlugin } from './keycloak.plugin.js';
import { PostgresPlugin } from './postgres.plugin.js';
import { TraefikPlugin } from './traefik.plugin.js';
import { TypesensePlugin } from './typesense.plugin.js';
import { MongodbPlugin } from './mongodb.plugin.js';
import {ConfigDeployement, ResourceToDeploy} from "../config.type.js";
import {AbstractPlugin} from "./abstract.plugin.js";


export const plugins: typeof AbstractPlugin[] = [
    KeycloakPlugin,
    PostgresPlugin,
    TraefikPlugin,
    TypesensePlugin,
    MongodbPlugin
]

export const getPluginFromKind = (kind: string) : typeof AbstractPlugin => {
    const plugin =  plugins.find(plugin => plugin.kind === kind)
    if (!plugin) {
        throw new Error(`No plugin found for kind ${kind}`)
    }
    console.log(`init plugin ${plugin.kind}`)
    return plugin;
}

export function getPluginFromConnexionKind(config: ConfigDeployement, kind: string, clusterName?: string): AbstractPlugin {
    const plugin = Object.values(config.resources.resources).find(plugin => plugin?.getConnexionKindNames().includes(kind) && (!clusterName || plugin?.clusterName === clusterName));
    if(!plugin) {
        throw new Error(`No plugin found for connexion kind ${kind}`)
    }
    return plugin;
}
