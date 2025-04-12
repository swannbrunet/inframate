# InfraMate : a lite tool for deploy application everywhere
## Introduction
Like container philosophy, InfraMate introduce a simple way to describe your infrastructure.
With this description, InfraMate aims to deploy your application on any cloud provider or on your local machine.
"Write once, deploy everywhere"

## Installation
### Requirements
- Node.js
- Docker
- Pulumi

### Installation in npm project
```sh
npm i inframate
```

### Installation in global
```sh
npm i -g inframate
```

## Configure pulumi
You need to setup backend configuration for pulumi.
```sh
pulumi login --local
```

## Usage in command line
Create local environment
```
inframate up 
```
Destroy local environment
```
inframate down
```

## Usage in server mode
### Installation
Autodeploy can be used in server mode to deploy application on remote server.
for start we need to deploy the server part of autodeploy on the remote server.
```
docker run -d -p 3000:3000 -v /var/run/docker.sock:/var/run/docker.sock -e SECRET_ACCESS_KEY=<YOUR_KEY> autodeploy
```

### Usage
To deploy an application run command :
```
curl --post https://<REMOTE_SERVER>:3000/deploy 
```

## Usage in library
InfraMate can be import in your project as a library.
with that you can extend the functionality of plugin and secret manager.
You can also use typescript type checking for project declaration.
Project declaration should be named : inframate.deploy.json or inframate.deploy.ts
For extend plugin or secret manager you should create a file named inframate.config.js or inframate.config.ts and export plugins a list of plugins and secretManager a secret manager.
plugins should extend Plugin class and secretManager should extend SecretManager class.

## inframate.deloy.json format 
```json
{
    "name": "my-app",
    "version": "1.0.0"
}
```


// Cuelang > generer du json et et yaml typé et tu peut mettre des test pour valider le format et tout. score.dev à regarder -> jsonnet / Tanka de kube ( remplacer le fonctionnement de helm )
### Proposition pour aporter un peu plus d'inovation : 
- Actuellement je suis en train de créer des layers à la main pour les plugins. Ce qui serait interessant c'est d'automatiser cette partie. 
- Faire en sorte que au moment de la génération je créer les layers et les stacks necessaire pour déployer l'app.
- Par exemple : une app nodejs avec une base de donnée mysql qui doit avoir des droits et un format de donnée dessus donne : 
  - Layer 1 instanciation de la base 
  - Layer 2 configuration de la base
  - Layer 3 instanciation de l'app avec tous les identifiants necessaire 
- L'objectif est de pouvoir générer un fichier de configuration qui va permettre de déployer l'app sur n'importe quel cloud provider.
- question : comment gérer les conflicts de stack ?
- Le problème est qu'avec pulumi on ne peut pas avoir de stack imbriqué. ( qui evolue au cours du temps)
- La solution serait de créer 1 stack par application ? et lancer en parallèle tout ce qui est paralelisable ?
- Faire sortie les partie quelle env doit être deployer -> juste faire la stack et puis ça passe 
