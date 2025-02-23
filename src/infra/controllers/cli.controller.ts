#!/usr/bin/env node

import { Command } from "commander";
import fs from 'fs';
import { deployAnInfrastructure } from "../../domains/useCases/deployInfratructure.workflow.usecase.js";

const program = new Command();

program
  .name("autodeploy")
  .description("an application for deploy stack everywhere with pulumi and docker")
  .version("1.0.0");

program
  .command("up")
  .description("deploy stack localy and watch")
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

program.parse(process.argv);