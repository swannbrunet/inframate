import { Router } from "express"
import { deployAnInfrastructure } from "../../domains/useCases/deploy/deployInfratructure.workflow.usecase.ts"

const router = Router()


function verifyToken(tokenToApprouved: any): boolean {
    const token = process.env.AUTO_DEPLOY_ACCESS_TOKEN
    return token === tokenToApprouved
}

router.post("/", function (req, res) {
    if (verifyToken(req.headers.authorization)) {
        if (req.body.projectName === undefined || req.body.stackName === undefined || req.body.projectURL === undefined) {
            res.status(400).send('projectName, stackName, projectURL required')
        } else {
            deployAnInfrastructure(req.body.projectName, req.body.stackName, req.body.projectURL).then(() => {
                res.status(201).send()
            }).catch((e: any) => {
                res.status(500).send(e)
            })
        }
    } else {
        res.status(403).send(`wrong token ${req.headers.authorization}`)
    }
})

export default router