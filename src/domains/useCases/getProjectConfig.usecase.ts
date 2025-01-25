import { execSync } from "child_process"
import fs from "fs/promises"
import { ProjectSetting } from "../projectStackType/projectSetting.type";

export async function getProjectConfig(projectURL: string, branch: string): Promise<ProjectSetting> {
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