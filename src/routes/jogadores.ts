import { prisma } from "../../lib/prisma"
import { Router } from "express"
import { z } from "zod"
import { enviaExtrato } from "../../lib/email"
import { tratarErro, errosZod } from "../../lib/erros"

const router = Router()

const jogadorSchema = z.object({
  nome: z.string()
    .min(3, "Nome deve possuir no mínimo 3 caracteres")
    .max(40, "Nome deve ter no máximo 40 caracteres"),
  nick: z.string()
    .min(2, "Nick deve possuir no mínimo 2 caracteres")
    .max(20, "Nick deve ter no máximo 20 caracteres"),
  email: z.email("E-mail inválido"),
  obs: z.string().optional()
})

router.get("/", async (req, res) => {
  // #swagger.tags = ['Jogadores']
  // #swagger.summary = 'Lista todos os jogadores'
  try {
    const jogadores = await prisma.jogador.findMany({ orderBy: { nome: "asc" } })
    res.status(200).json(jogadores)
  } catch (error) {
    tratarErro(error, res)
  }
})

router.get("/:id", async (req, res) => {
  // #swagger.tags = ['Jogadores']
  // #swagger.summary = 'Busca um jogador pelo id'
  const { id } = req.params
  try {
    const jogador = await prisma.jogador.findUnique({ where: { id: Number(id) } })
    if (!jogador) {
      res.status(404).json({ erro: "Jogador não encontrado" })
      return
    }
    res.status(200).json(jogador)
  } catch (error) {
    tratarErro(error, res)
  }
})

router.post("/", async (req, res) => {
  // #swagger.tags = ['Jogadores']
  // #swagger.summary = 'Cadastra um jogador (saldo inicia em R$ 0,00)'
  const valida = jogadorSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erros: errosZod(valida.error.issues) })
    return
  }
  try {
    const jogador = await prisma.jogador.create({ data: valida.data })
    res.status(201).json(jogador)
  } catch (error) {
    tratarErro(error, res)
  }
})

router.put("/:id", async (req, res) => {
  // #swagger.tags = ['Jogadores']
  // #swagger.summary = 'Altera os dados de um jogador (o saldo só muda por recargas e sessões)'
  const { id } = req.params
  const valida = jogadorSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erros: errosZod(valida.error.issues) })
    return
  }
  try {
    const jogador = await prisma.jogador.update({
      where: { id: Number(id) },
      data: valida.data
    })
    res.status(200).json(jogador)
  } catch (error) {
    tratarErro(error, res)
  }
})

router.delete("/:id", async (req, res) => {
  // #swagger.tags = ['Jogadores']
  // #swagger.summary = 'Exclui um jogador (somente se não tiver sessões ou recargas)'
  const { id } = req.params
  try {
    const jogador = await prisma.jogador.delete({ where: { id: Number(id) } })
    res.status(200).json(jogador)
  } catch (error) {
    tratarErro(error, res)
  }
})

router.get("/email/:id", async (req, res) => {
  // #swagger.tags = ['Jogadores']
  // #swagger.summary = 'Envia por e-mail o extrato de sessões e recargas do jogador'
  const { id } = req.params
  try {
    const jogador = await prisma.jogador.findUnique({
      where: { id: Number(id) },
      include: {
        recargas: true,
        sessoes: { include: { estacao: true } }
      }
    })
    if (!jogador) {
      res.status(404).json({ erro: "Jogador não encontrado" })
      return
    }
    const messageId = await enviaExtrato(jogador)
    res.status(200).json({
      mensagem: `Extrato enviado para ${jogador.email}`,
      messageId,
      sessoes: jogador.sessoes.length,
      recargas: jogador.recargas.length,
      saldo: jogador.saldo
    })
  } catch (error) {
    tratarErro(error, res)
  }
})

export default router
