import fs from 'fs/promises'

interface DataStored {
    [key: string]: string | undefined,
}

export class secretManager {

    private readonly FILE_NAME  = "./data-env-config.json"

    constructor() {

    }

    private generateSecret(): string {
        return Math.random().toString(36).substr(2) +  Math.random().toString(36).substr(2);        
    }

    async getSecret(key: string) : Promise<string | undefined> {
        try {
        const values: DataStored = JSON.parse((await fs.readFile(this.FILE_NAME)).toString())
        if(values) {
            return values[key]
        }
        return undefined
    } catch {
        return undefined
    }
    }

    async setSecret(key: string, value: string): Promise<string | undefined> {
        try {
            const values: DataStored = JSON.parse((await fs.readFile(this.FILE_NAME).catch(() => "")).toString())
            values[key] = value
            await fs.writeFile(this.FILE_NAME, JSON.stringify(values))
            return value
        } catch {
            return undefined
        }
    }

    async getOrCreateSecret(key: string): Promise<string | undefined> {
            const values: DataStored = JSON.parse((await fs.readFile(this.FILE_NAME).catch(() => "{}")).toString())
            if(values[key]) {
                return values[key]
            } else {
                values[key] = this.generateSecret()
            }
            await fs.writeFile(this.FILE_NAME, JSON.stringify(values))
            return values[key]
    }
}