import swaggerAutogen from "swagger-autogen"

const doc = {
  info: {
    title: "API Arena Lan House",
    description: "Controle de sessões de jogo de uma Lan House: jogadores, estações, recargas de crédito e sessões (com transações).",
    version: "1.0.0"
  },
  servers: [{ url: "http://localhost:3000" }],
  tags: [
    { name: "Jogadores", description: "CRUD de jogadores e envio do extrato por e-mail" },
    { name: "Estações", description: "CRUD das estações (PCs, consoles e simuladores)" },
    { name: "Recargas", description: "Recargas de crédito (transação: recarga + saldo)" },
    { name: "Sessões", description: "Sessões de jogo (transação: sessão + saldo + estação)" }
  ]
}

const outputFile = "./swagger-output.json"
// Arquivo principal que registra as rotas
const routes = ["./src/server.ts"]

swaggerAutogen({ openapi: "3.0.0" })(outputFile, routes, doc)
