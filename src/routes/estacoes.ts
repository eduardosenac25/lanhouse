import { prisma } from "../../lib/prisma"
import { Router } from "express"
import { z } from "zod"
import { tratarErro, errosZod } from "../../lib/erros"

const router = Router()

const estacaoSchema = z.object({
  nome: z.string()
    .min(2, "Nome deve possuir no mínimo 2 caracteres")
    .max(20, "Nome deve ter no máximo 20 caracteres"),
  tipo: z.enum(["PC", "Console", "Simulador"], { message: "Tipo deve ser PC, Console ou Simulador" }),
  valorHora: z.number().positive("Valor da hora deve ser positivo"),
  status: z.enum(["livre", "ocupada"], { message: "Status deve ser livre ou ocupada" }).optional()
})

router.get("/", async (req, res) => {
  // #swagger.tags = ['Estações']
  // #swagger.summary = 'Lista todas as estações (PCs, consoles e simuladores)'
  try {
    const estacoes = await prisma.estacao.findMany({ orderBy: { nome: "asc" } })
    res.status(200).json(estacoes)
  } catch (error) {
    tratarErro(error, res)
  }
})

router.get("/:id", async (req, res) => {
  // #swagger.tags = ['Estações']
  // #swagger.summary = 'Busca uma estação pelo id'
  const { id } = req.params
  try {
    const estacao = await prisma.estacao.findUnique({ where: { id: Number(id) } })
    if (!estacao) {
      res.status(404).json({ erro: "Estação não encontrada" })
      return
    }
    res.status(200).json(estacao)
  } catch (error) {
    tratarErro(error, res)
  }
})

router.post("/", async (req, res) => {
  // #swagger.tags = ['Estações']
  // #swagger.summary = 'Cadastra uma estação (inicia como livre)'
  const valida = estacaoSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erros: errosZod(valida.error.issues) })
    return
  }
  try {
    const estacao = await prisma.estacao.create({ data: valida.data })
    res.status(201).json(estacao)
  } catch (error) {
    tratarErro(error, res)
  }
})

router.put("/:id", async (req, res) => {
  // #swagger.tags = ['Estações']
  // #swagger.summary = 'Altera os dados de uma estação'
  const { id } = req.params
  const valida = estacaoSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erros: errosZod(valida.error.issues) })
    return
  }
  try {
    const estacao = await prisma.estacao.update({
      where: { id: Number(id) },
      data: valida.data
    })
    res.status(200).json(estacao)
  } catch (error) {
    tratarErro(error, res)
  }
})

router.patch("/:id/liberar", async (req, res) => {
  // #swagger.tags = ['Estações']
  // #swagger.summary = 'Libera a estação (encerra o uso após o fim da sessão)'
  const { id } = req.params
  try {
    const estacao = await prisma.estacao.update({
      where: { id: Number(id) },
      data: { status: "livre" }
    })
    res.status(200).json(estacao)
  } catch (error) {
    tratarErro(error, res)
  }
})

router.delete("/:id", async (req, res) => {
  // #swagger.tags = ['Estações']
  // #swagger.summary = 'Exclui uma estação (somente se não tiver sessões)'
  const { id } = req.params
  try {
    const estacao = await prisma.estacao.delete({ where: { id: Number(id) } })
    res.status(200).json(estacao)
  } catch (error) {
    tratarErro(error, res)
  }
})

export default router
