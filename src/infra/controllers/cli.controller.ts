#!/usr/bin/env node --experimental-transform-types --no-warnings

import { Command } from "commander";
import fs from 'fs';
import { deployAnInfrastructure } from "../../domains/useCases/deploy/deployInfratructure.workflow.usecase.ts";
import { displayAnInfrastructure } from "../../domains/useCases/display/displayAnInfrastructure.ts";

const program = new Command();

program
  .name("autodeploy")
  .description("an application for deploy stack everywhere with pulumi and docker")
  .version("1.0.0");

program
  .command("up")
  .description("deploy stack locally and watch")
  .action(() => {
    const info = JSON.parse(fs.readFileSync('package.json').toString())
    console.log(`start deployment ${info.name}`)
    deployAnInfrastructure(info.name, 'local', '.').then(() => {
        console.log('Successfully deployed')
    }).catch((e) => {
        console.log('An error occured:', e)
        process.exit(1)
    })
  });

program
    .command("preview")
    .description("display all changement of infrastructure")
    .action(() => {
        throw 'Not implemented'
    });

program
    .command("down")
    .description("destroy environement")
    .action(() => {
        throw 'Not implemented'
    });

program
    .command("display")
    .description("display all infrastructure with step description")
    .option('-e, --env <string>', 'specify the environment used for deploy infrastructure ( give to npm run deployment.js )', 'local')
    .action((options) => {
        const info = JSON.parse(fs.readFileSync('package.json').toString())
        displayAnInfrastructure(info.name, options.env, '.').catch(e => {
            console.log('An error occured:', e)
            process.exit(1)
        })
    });

program.parse(process.argv);
