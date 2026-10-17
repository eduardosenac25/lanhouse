import express from "express"
import swaggerUi from "swagger-ui-express"
import swaggerDocument from "../swagger-output.json"

const app = express()
const port = 3000

import routesJogadores from "./routes/jogadores"
import routesEstacoes from "./routes/estacoes"
import routesSessoes from "./routes/sessoes"
import routesRecargas from "./routes/recargas"

app.use(express.json())

// Documentação Swagger
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument))

app.use("/jogadores", routesJogadores)
app.use("/estacoes", routesEstacoes)
app.use("/sessoes", routesSessoes)
app.use("/recargas", routesRecargas)

app.get("/", (req, res) => {
  res.send("API: Sistema de Controle de Sessões de uma Lan House")
})

app.listen(port, () => {
  console.log(`Servidor Rodando na Porta: ${port}`)
})
