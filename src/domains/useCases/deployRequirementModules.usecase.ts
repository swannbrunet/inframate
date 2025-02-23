import * as Docker from '@pulumi/docker/index.js'
import * as pulumi from "@pulumi/pulumi/automation/index.js";
import { generateStack } from "../stackGenerator/index.js";
import { ProjectSetting } from "../projectStackType/projectSetting.type.js";
import { interpolate } from '@pulumi/pulumi';

export class DeployRequirementModules {

    private getStack() {
        const provider = new Docker.Provider("docker-provider", {})

        const traeffikImage = new Docker.RemoteImage("traefik", {
            name: "traefik:v3.3"
        }, { provider })

        const traefikNetwork = new Docker.Network("traefikNetwork", {
            name: "traefik",
        }, { provider })

        new Docker.Container("treafikContainer", {
            image: traeffikImage.imageId,
            ports: [
                {
                    internal: 80,
                    external: 80,
                    ip: "127.0.0.1"
                },
                {
                    internal: 443,
                    external: 443,
                    ip: "127.0.0.1"
                },
                {
                    internal: 8080,
                    external: 8080,
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
                }
            ],
            networksAdvanced: [
                {
                    name: traefikNetwork.name
                },
            ],
            command: [
                '--api.insecure=true',
                '--api.dashboard=true',
                "--providers.docker=true",
                "--providers.docker.exposedbydefault=false",
                interpolate`--providers.docker.network=${traefikNetwork.name}`,
                '--entrypoints.websecure.address=:443',
                '--entrypoints.websecure.http.tls=true',
                '--entrypoints.websecure.http.tls.certresolver=le',
                "--certificatesresolvers.le.acme.tlschallenge=true",
                "--certificatesresolvers.le.acme.email=swannbrunet@hotmail.fr",
                "--certificatesresolvers.le.acme.storage=/letsencrypt/acme.json",
                "--certificatesresolvers.le.acme.tlschallenge=true",
                "--entrypoints.web.address=:80",
                "--entrypoints.web.http.redirections.entrypoint.to=websecure",
                "--entrypoints.web.http.redirections.entrypoint.scheme=https"
            ],
        }, { provider })

    }

    async execute() {
        const stackName =  "global-local-config"
        const workspace = await pulumi.LocalWorkspace.create({
            projectSettings: {
                name: stackName,
                runtime: "nodejs"
            },
            program: async () => {
                return this.getStack()
            }
        });
    
        const stack = await pulumi.Stack.createOrSelect(stackName, workspace);
        await stack.refresh();
        await stack.up({ logFlow: true });
    
        console.log("Deployment complete.");
    }
}