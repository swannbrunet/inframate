import { execSync } from "child_process"
import fs from "fs/promises"
import { ProjectSetting } from "../projectStackType/projectSetting.type.js";

async function getLocalProjectConfig(): Promise<ProjectSetting> {
    const dir = await fs.readdir('.')
    if (dir.includes('deployment.json')) {
        const file = await fs.readFile(`deployment.json`)
        const data = JSON.parse(file.toString())
        return data
    }
    throw 'deployement.json not found in local projet'
}

export async function getProjectConfig(projectURL: string, branch: string): Promise<ProjectSetting> {
    if(projectURL === '.') {
        return getLocalProjectConfig()
    }
    const folder = Math.random().toString(36).substr(2);
    console.log('Create tmp folder')
    await fs.mkdir(`data/tmp/${folder}`)
    console.log('Download deployement.json')
    execSync(`git clone -b ${branch} ${projectURL} data/tmp/${folder}`)
    console.log('Load file')
    const file = await fs.readFile(`data/tmp/${folder}/deployement.json`)
    console.log('Parse file')
    const data = JSON.parse(file.toString())
    console.log('Delete file')
    await fs.rm(`data/tmp/${folder}`, { recursive: true })
    return data
}