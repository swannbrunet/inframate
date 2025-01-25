import express from "express"
import deployementRouter from "./infra/controllers/deployement.controller"
import bodyParser from "body-parser"

const app = express()

app.use(bodyParser.urlencoded())
app.use(bodyParser.json())

app.use("/deploy", deployementRouter)


app.listen(process.env.PORT || 3000, () => {
    console.log('Listen on port ', process.env.PORT || 3000)
})