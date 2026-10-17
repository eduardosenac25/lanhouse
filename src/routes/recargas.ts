import { prisma } from "../../lib/prisma"
import { Router } from "express"
import { z } from "zod"
import { RegraNegocio, tratarErro, errosZod } from "../../lib/erros"

const router = Router()

const recargaSchema = z.object({
  jogadorId: z.number().int().positive(),
  valor: z.number().positive("Valor deve ser positivo"),
  tipo: z.enum(["pix", "dinheiro", "cartao"], { message: "Tipo deve ser pix, dinheiro ou cartao" })
})

router.get("/", async (req, res) => {
  // #swagger.tags = ['Recargas']
  // #swagger.summary = 'Lista as recargas de crédito (mais recentes primeiro)'
  try {
    const recargas = await prisma.recarga.findMany({
      include: { jogador: { select: { id: true, nome: true, nick: true } } },
      orderBy: { data: "desc" }
    })
    res.status(200).json(recargas)
  } catch (error) {
    tratarErro(error, res)
  }
})

router.post("/", async (req, res) => {
  // #swagger.tags = ['Recargas']
  // #swagger.summary = 'Registra uma recarga e soma o valor ao saldo do jogador (transação)'
  const valida = recargaSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erros: errosZod(valida.error.issues) })
    return
  }
  const { jogadorId, valor, tipo } = valida.data

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const jogador = await tx.jogador.findUnique({ where: { id: jogadorId } })
      if (!jogador) throw new RegraNegocio("Código do jogador inválido")

      const recarga = await tx.recarga.create({ data: { jogadorId, valor, tipo } })
      const jogadorAtual = await tx.jogador.update({
        where: { id: jogadorId },
        data: { saldo: { increment: valor } }
      })
      return { recarga, jogador: { id: jogadorAtual.id, nome: jogadorAtual.nome, saldo: jogadorAtual.saldo } }
    })
    res.status(201).json(resultado)
  } catch (error) {
    tratarErro(error, res)
  }
})

router.delete("/:id", async (req, res) => {
  // #swagger.tags = ['Recargas']
  // #swagger.summary = 'Estorna uma recarga: exclui o registro e retira o valor do saldo (transação)'
  const { id } = req.params

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const recarga = await tx.recarga.findUnique({ where: { id: Number(id) } })
      if (!recarga) throw new RegraNegocio("Recarga não encontrada", 404)

      // só estorna se o jogador ainda tiver saldo suficiente (evita saldo negativo)
      const debitou = await tx.jogador.updateMany({
        where: { id: recarga.jogadorId, saldo: { gte: recarga.valor } },
        data: { saldo: { decrement: recarga.valor } }
      })
      if (debitou.count === 0) {
        throw new RegraNegocio("Saldo atual do jogador é menor que o valor da recarga; não é possível estornar")
      }

      await tx.recarga.delete({ where: { id: recarga.id } })
      const jogador = await tx.jogador.findUnique({
        where: { id: recarga.jogadorId },
        select: { id: true, nome: true, saldo: true }
      })
      return { recarga, jogador }
    })
    res.status(200).json(resultado)
  } catch (error) {
    tratarErro(error, res)
  }
})

export default router
