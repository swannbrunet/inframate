import {
    type AbstractConnexion, AbstractPlugin,
    type AbstractPluginConfig,
    type ConnexionSetting,
    type DeploymentPlan,
    StageType
} from "./abstract.plugin.ts";
import * as Pulumi from "@pulumi/pulumi";
import * as Docker from "@pulumi/docker";
import type {ConfigDeployement} from "../config.type.ts";
import YAML from "yaml";
import os from "os";

export class TraefikPlugin extends AbstractPlugin {
    readonly identifier: string = "traefik"
    static kind = "traefik";
    type = TraefikPlugin.name;

    getConnexionKindNames(): string[] {
        return ["traefik"];
    }

    getDeploymentPlan(): DeploymentPlan {
        return [
            {
                temporary: false,
                project: `inframate-global-resources-traefik-step-1-init-config`,
                stack: `global`,
                type: StageType.INFRA,
                run: async (mode) => {
                    const provider = this.configDeployment.provider()
                    const volume = new Docker.Volume("traefik-config-store", {
                        name: "traefik-config-store",
                        labels: [
                            {
                                label: "com.docker.compose.project",
                                value: "autodeploy_global_resources"
                            }
                        ]
                    }, { provider })

                    new Docker.Container("traefik-config-init", {
                        name: "traefik-config-init",
                        image: "alpine",
                        volumes: [
                            {
                                volumeName: volume.name,
                                containerPath: "/traefik"
                            }
                        ],
                        command: [
                            "sh",
                            "-c",
                            `echo '${YAML.stringify({
                                api: {
                                    dashboard: true,
                                    insecure: true
                                },
                                providers: {
                                    docker: {
                                        exposedByDefault: false,
                                        network: "traefik"
                                    },
                                    file: {
                                        filename: "/config/config-dynamic.yml"
                                    }
                                },
                                entryPoints: {
                                    web: {
                                        address: ":80",
                                        http: {
                                            redirections: {
                                                entryPoint: {
                                                    to: "websecure",
                                                    scheme: "https"
                                                }
                                            }
                                        }
                                    },
                                    websecure: {
                                        address: ":443",
                                        http: {
                                            tls: true
                                        }
                                    }
                                },
                            })}' > /traefik/config.yml`,
                        ],
                        mustRun: false,
                        restart: "no",
                    }, { provider})

                    new Docker.Container("traefik-config-init-dynamic-certificate", {
                        name: "traefik-config-init-dynamic-certificate",
                        image: "alpine",
                        volumes: [
                            {
                                volumeName: volume.name,
                                containerPath: "/traefik"
                            }
                        ],
                        command: [
                            "sh",
                            "-c",
                            `echo '${YAML.stringify({
                                tls: {
                                    certificates: [{
                                        certFile: "/certs/cert.pem",
                                        keyFile: "/certs/key.pem"
                                    }]
                                }
                            })}' > /traefik/config-dynamic.yml`,
                        ],
                        mustRun: false,
                        restart: "no",
                    }, { provider})
                }
            },
            {
                temporary: false,
                project: `inframate-global-resources-traefik-step-1`,
                stack: `global`,
                type: StageType.INFRA,
                run: async () => {
                    const provider = this.configDeployment.provider()
                    const traefikImage = new Docker.RemoteImage("traefik", {
                        name: "traefik:v3.3"
                    }, { provider})

                    const traefikNetwork = new Docker.Network("traefikNetwork", {
                        name: "traefik",
                    }, { provider})

                    new Docker.Container("treafikContainer", {
                        image: traefikImage.imageId,
                        ports: [
                            {
                                internal: 80,
                                external: 8080,
                                ip: "127.0.0.1"
                            },
                            {
                                internal: 443,
                                external: 8443,
                                ip: "127.0.0.1"
                            },
                            {
                                internal: 8080,
                                external: 8081,
                                ip: "127.0.0.1"
                            }
                        ],
                        volumes: [
                            {
                                hostPath: "/var/run/docker.sock",
                                containerPath: "/var/run/docker.sock",
                                readOnly: true
                            },
                            {
                                volumeName: 'traefik-certificate-store',
                                containerPath: "/letsencrypt",
                            },
                            {
                                volumeName: 'traefik-config-store',
                                containerPath: "/config",
                            },
                            {
                                hostPath: `${os.homedir()}/.inframate/certificates`,
                                containerPath: "/certs",
                            }
                        ],
                        networksAdvanced: [
                            {
                                name: traefikNetwork.name
                            },
                        ],
                        command: [
                            "--configfile=/config/config.yml",
                        ],
                        labels: [
                            {
                                label: "com.docker.compose.project",
                                value: "inframate_global_resources"
                            }
                        ]
                    }, { provider})
                }
            }
        ]
    }

    async getConnexion(setting: TraefikConnexion): Promise<ConnexionSetting> {
        this.configDeployment.resources.externalDomain.push({ service: setting.identifier, domain: setting.domain })
        return {
            labels: [
                {
                    value: Pulumi.interpolate`Host(\`${setting.domain}\`)`,
                    label: Pulumi.interpolate`traefik.http.routers.${setting.identifier}.rule`
                },
                {
                    label: Pulumi.interpolate`traefik.http.routers.${setting.identifier}.entrypoints`,
                    value: 'websecure'
                },
                {
                    label: Pulumi.interpolate`traefik.http.routers.${setting.identifier}.tls`,
                    value: 'true'
                },
                /*{
                    label: Pulumi.interpolate`traefik.http.routers.${setting.identifier}.tls.certresolver`,
                    value: 'le'
                },*/
                {
                    label: Pulumi.interpolate`traefik.http.services.${setting.identifier}.loadbalancer.server.port`,
                    value: Pulumi.interpolate`${setting.port}`
                },
                {
                    label: 'traefik.enable',
                    value: 'true'
                }
            ],
            networks: [ "traefik" ]
        }
    }

    getLabel(): string {
        return "global traefik";
    }

    static getPlugin(config: TraefikConfigPlugin, configDeployement: ConfigDeployement): TraefikPlugin {
        const identifier = `traefik`
        if(configDeployement.resources.resources[identifier]) {
            return configDeployement.resources.resources[identifier] as TraefikPlugin;
        } else {
            const plugin = new TraefikPlugin(config, configDeployement);
            configDeployement.resources.resources[identifier] = plugin;
            return plugin;
        }
    }
}

export interface TraefikConnexion extends AbstractConnexion {
    kind: "traefik";
    port: number;
    domain: string;
    identifier: string;
}

export interface TraefikConfigPlugin extends AbstractPluginConfig {
    kind: "traefik"
}


