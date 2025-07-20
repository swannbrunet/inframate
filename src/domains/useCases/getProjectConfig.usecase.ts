import { execSync } from "child_process"
import fs from "fs/promises"
import type {ProjectSetting} from "../projectStackType/projectSetting.type.ts";

async function getLocalProjectConfig(stackName: string): Promise<ProjectSetting> {
    const dir = await fs.readdir('.')
    if (dir.includes('deployment.json')) {
        const file = await fs.readFile(`deployment.json`)
        const data = JSON.parse(file.toString())
        return data
    } else if (dir.includes('package.json')) {
        const result = execSync(`npm run --silent deployment.json --env=${stackName}`)
        const data = JSON.parse(result.toString())
        return data
    }
    throw 'deployement.[json|ts]  not found in local projet'
}

export async function getProjectConfig(projectURL: string, stackName: string): Promise<ProjectSetting> {
    if(projectURL === '.') {
        return getLocalProjectConfig(stackName)
    }
    const folder = Math.random().toString(36).substr(2);
    console.log('Create tmp folder')
    await fs.mkdir(`data/tmp/${folder}`)
    console.log('Download deployement.json')
    execSync(`git clone -b ${stackName} ${projectURL} data/tmp/${folder}`)
    console.log('Load file')
    const file = await fs.readFile(`data/tmp/${folder}/deployement.json`)
    console.log('Parse file')
    const data = JSON.parse(file.toString())
    console.log('Delete file')
    await fs.rm(`data/tmp/${folder}`, { recursive: true })
    return data
}