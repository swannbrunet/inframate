import fs from "fs";
import {execSync} from "child_process";

export class UpdateHostFileUsecase {
    execute(projectId: string, domains: string[]) {
        const hostFilePath = "/etc/hosts";
        const hostFileContent = fs.readFileSync(hostFilePath, "utf8");
        const hostFileLines = hostFileContent.split("\n");
        const startLabel = `[INFRAMATE][START] ==== ${projectId} ====`;
        const endLabel = `[INFRAMATE][END] ==== ${projectId} ====`;
        const start = hostFileLines.findIndex(line => line === startLabel)
        const end = hostFileLines.findIndex(line => line === endLabel)
        if(start !== -1 && end !== -1) {
            hostFileLines.splice(start, end - start + 1)
        }
        hostFileLines.push(startLabel, ...domains.map(domain => `127.0.0.1 ${domain}`), endLabel);
        fs.writeFileSync(hostFilePath, hostFileLines.join("\n"));
        this.setCertificate(hostFileLines).then(() => {}).catch(err => {
            console.error(err)
        })
    }

    getLocalDeveloppementDomains(elements: string[]) {
        const domains = elements.filter(element => element.includes('dev.local')).map(element => {
            const domain = element.split(' ')[1]
            return domain
        })
        return domains

    }

    async setCertificate(dnsEntry: string[]) {
        const allDomain = this.getLocalDeveloppementDomains(dnsEntry)
        fs.mkdirSync(`${process.env.HOME}/.inframate/certificates`, { recursive: true})
        execSync(`mkcert -cert-file ${process.env.HOME}/.inframate/certificates/cert.pem -key-file ${process.env.HOME}/.inframate/certificates/key.pem ${allDomain.join(' ')}`, { stdio: 'ignore' });
    }
}
