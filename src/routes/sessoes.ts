import { prisma } from "../../lib/prisma"
import { Router } from "express"
import { z } from "zod"
import { RegraNegocio, tratarErro, errosZod } from "../../lib/erros"

const router = Router()

const sessaoSchema = z.object({
  jogadorId: z.number().int().positive(),
  estacaoId: z.number().int().positive(),
  horas: z.number()
    .positive("Horas deve ser positivo")
    .max(12, "Máximo de 12 horas por sessão")
    .multipleOf(0.5, "Horas deve ser múltiplo de 0,5 (ex.: 1, 1.5, 2)")
})

const incluirJogadorEstacao = {
  jogador: { select: { id: true, nome: true, nick: true } },
  estacao: { select: { id: true, nome: true, tipo: true } }
}

router.get("/", async (req, res) => {
  // #swagger.tags = ['Sessões']
  // #swagger.summary = 'Lista as sessões de jogo (mais recentes primeiro)'
  // #swagger.parameters['jogadorId'] = { in: 'query', description: 'Filtra as sessões de um jogador', required: false, type: 'integer' }
  const { jogadorId } = req.query
  try {
    const sessoes = await prisma.sessao.findMany({
      where: jogadorId ? { jogadorId: Number(jogadorId) } : {},
      include: incluirJogadorEstacao,
      orderBy: { data: "desc" }
    })
    res.status(200).json(sessoes)
  } catch (error) {
    tratarErro(error, res)
  }
})

router.get("/:id", async (req, res) => {
  // #swagger.tags = ['Sessões']
  // #swagger.summary = 'Busca uma sessão pelo id'
  const { id } = req.params
  try {
    const sessao = await prisma.sessao.findUnique({
      where: { id: Number(id) },
      include: incluirJogadorEstacao
    })
    if (!sessao) {
      res.status(404).json({ erro: "Sessão não encontrada" })
      return
    }
    res.status(200).json(sessao)
  } catch (error) {
    tratarErro(error, res)
  }
})

router.post("/", async (req, res) => {
  /*
    #swagger.tags = ['Sessões']
    #swagger.summary = 'Abre uma sessão de jogo (transação)'
    #swagger.description = 'Rota de inclusão com transação. Em uma única transação o sistema: (1) valida jogador e estação; (2) confere se a estação está livre; (3) confere se o saldo do jogador cobre horas x valor da hora; (4) grava a sessão com o preço da hora daquele momento; (5) debita o valor do saldo do jogador; (6) marca a estação como ocupada. Se qualquer passo falhar, nada é gravado (rollback).'
    #swagger.requestBody = {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["jogadorId", "estacaoId", "horas"],
            properties: {
              jogadorId: { type: "integer", description: "Id do jogador que vai jogar", example: 1 },
              estacaoId: { type: "integer", description: "Id da estação (precisa estar livre)", example: 3 },
              horas: { type: "number", description: "Tempo contratado, de 0.5 a 12, em múltiplos de 0.5", example: 2 }
            }
          },
          example: { jogadorId: 1, estacaoId: 3, horas: 2 }
        }
      }
    }
    #swagger.responses[201] = {
      description: 'Sessão criada. Retorna a sessão, o jogador com o saldo atualizado e a estação ocupada.',
      content: {
        "application/json": {
          example: {
            sessao: { id: 12, jogadorId: 1, estacaoId: 3, horas: "2", preco: "8", data: "2026-10-16T22:10:00.000Z" },
            jogador: { id: 1, nome: "Eduardo", saldo: "34" },
            estacao: { id: 3, nome: "PC-03", status: "ocupada" }
          }
        }
      }
    }
    #swagger.responses[400] = {
      description: 'Dados inválidos, jogador/estação inexistente ou saldo insuficiente.',
      content: { "application/json": { example: { erro: "Saldo insuficiente. Saldo atual do jogador: R$ 10.00; custo da sessão: R$ 16.00" } } }
    }
    #swagger.responses[409] = {
      description: 'A estação já está ocupada.',
      content: { "application/json": { example: { erro: "A estação PC-03 está ocupada" } } }
    }
  */
  const valida = sessaoSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erros: errosZod(valida.error.issues) })
    return
  }
  const { jogadorId, estacaoId, horas } = valida.data

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const jogador = await tx.jogador.findUnique({ where: { id: jogadorId } })
      if (!jogador) throw new RegraNegocio("Código do jogador inválido")

      const estacao = await tx.estacao.findUnique({ where: { id: estacaoId } })
      if (!estacao) throw new RegraNegocio("Código da estação inválido")

      const preco = Number(estacao.valorHora)
      const custo = horas * preco

      // ocupa a estação somente se ainda estiver livre (evita duas sessões na mesma estação)
      const ocupou = await tx.estacao.updateMany({
        where: { id: estacaoId, status: "livre" },
        data: { status: "ocupada" }
      })
      if (ocupou.count === 0) throw new RegraNegocio(`A estação ${estacao.nome} está ocupada`, 409)

      // debita somente se o saldo cobrir o custo
      const debitou = await tx.jogador.updateMany({
        where: { id: jogadorId, saldo: { gte: custo } },
        data: { saldo: { decrement: custo } }
      })
      if (debitou.count === 0) {
        throw new RegraNegocio(
          `Saldo insuficiente. Saldo atual do jogador: R$ ${Number(jogador.saldo).toFixed(2)}; custo da sessão: R$ ${custo.toFixed(2)}`
        )
      }

      const sessao = await tx.sessao.create({ data: { jogadorId, estacaoId, horas, preco } })
      const jogadorAtual = await tx.jogador.findUnique({
        where: { id: jogadorId },
        select: { id: true, nome: true, saldo: true }
      })
      const estacaoAtual = await tx.estacao.findUnique({
        where: { id: estacaoId },
        select: { id: true, nome: true, status: true }
      })
      return { sessao, jogador: jogadorAtual, estacao: estacaoAtual }
    })
    res.status(201).json(resultado)
  } catch (error) {
    tratarErro(error, res)
  }
})

router.delete("/:id", async (req, res) => {
  // #swagger.tags = ['Sessões']
  // #swagger.summary = 'Cancela uma sessão: exclui o registro, estorna o valor ao jogador e libera a estação (transação)'
  const { id } = req.params

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const sessao = await tx.sessao.findUnique({ where: { id: Number(id) } })
      if (!sessao) throw new RegraNegocio("Sessão não encontrada", 404)

      const estorno = Number(sessao.horas) * Number(sessao.preco)

      await tx.sessao.delete({ where: { id: sessao.id } })
      await tx.jogador.update({
        where: { id: sessao.jogadorId },
        data: { saldo: { increment: estorno } }
      })
      await tx.estacao.update({
        where: { id: sessao.estacaoId },
        data: { status: "livre" }
      })

      const jogador = await tx.jogador.findUnique({
        where: { id: sessao.jogadorId },
        select: { id: true, nome: true, saldo: true }
      })
      const estacao = await tx.estacao.findUnique({
        where: { id: sessao.estacaoId },
        select: { id: true, nome: true, status: true }
      })
      return { sessao, jogador, estacao }
    })
    res.status(200).json(resultado)
  } catch (error) {
    tratarErro(error, res)
  }
})

export default router
