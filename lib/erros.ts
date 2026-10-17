import type { Response } from "express"

// Erro de regra de negócio (ex.: saldo insuficiente). Cancela a transação.
export class RegraNegocio extends Error {
  status: number
  constructor(mensagem: string, status = 400) {
    super(mensagem)
    this.status = status
  }
}

// Converte qualquer erro em uma resposta HTTP amigável
export function tratarErro(error: unknown, res: Response) {
  if (error instanceof RegraNegocio) {
    res.status(error.status).json({ erro: error.message })
    return
  }
  const codigo = (error as { code?: string })?.code
  if (codigo === "P2025") {
    res.status(404).json({ erro: "Registro não encontrado" })
    return
  }
  if (codigo === "P2002") {
    res.status(409).json({ erro: "Já existe um registro com este valor único (nick ou nome)" })
    return
  }
  if (codigo === "P2003") {
    res.status(409).json({ erro: "Registro possui vínculos (sessões/recargas) e não pode ser excluído" })
    return
  }
  console.error(error)
  res.status(500).json({ erro: "Erro no servidor" })
}

// Formata os erros do Zod: [{ campo, mensagem }]
export function errosZod(issues: { path: PropertyKey[]; message: string }[]) {
  return issues.map(e => ({ campo: e.path[0], mensagem: e.message }))
}
