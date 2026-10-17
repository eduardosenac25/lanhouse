import "dotenv/config"
import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
})

const moeda = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const dataHora = (d: Date) =>
  d.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  }).replace(",", "")

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

type Linha = { data: Date, descricao: string, valor: number, debito: number, credito: number }

export function gerarExtratoHTML(jogador: any): string {
  const linhas: Linha[] = [
    ...jogador.recargas.map((r: any): Linha => ({
      data: r.data,
      descricao: `Recarga (${esc(r.tipo)})`,
      valor: Number(r.valor), debito: 0, credito: Number(r.valor)
    })),
    ...jogador.sessoes.map((s: any): Linha => {
      const total = Number(s.horas) * Number(s.preco)
      return {
        data: s.data,
        descricao: `${Number(s.horas).toLocaleString("pt-BR")} h em ${esc(s.estacao.nome)} (${esc(s.estacao.tipo)})`,
        valor: Number(s.preco), debito: total, credito: 0
      }
    })
  ].sort((a, b) => a.data.getTime() - b.data.getTime())

  const totalDebito = linhas.reduce((t, l) => t + l.debito, 0)
  const totalCredito = linhas.reduce((t, l) => t + l.credito, 0)

  const celula = "border:1px solid #ccc;padding:6px 10px;"
  const corpo = linhas.map(l => `
      <tr>
        <td style="${celula}">${dataHora(l.data)}</td>
        <td style="${celula}">${l.descricao}</td>
        <td style="${celula}text-align:right;">${moeda(l.valor)}</td>
        <td style="${celula}text-align:right;">${l.debito ? moeda(l.debito) : ""}</td>
        <td style="${celula}text-align:right;">${l.credito ? moeda(l.credito) : ""}</td>
      </tr>`).join("")

  return `
  <html>
    <body style="font-family:Arial,sans-serif;">
      <h2>Arena Lan House: Extrato de Sessões e Recargas</h2>
      <h4>Jogador: ${esc(jogador.nome)} (${esc(jogador.nick)})</h4>
      <table style="border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#e6e6e6;">
            <th style="${celula}">Data e Hora</th>
            <th style="${celula}">Sessão/Recarga</th>
            <th style="${celula}">Valor R$ (hora/recarga)</th>
            <th style="${celula}">Débito R$</th>
            <th style="${celula}">Crédito R$</th>
          </tr>
        </thead>
        <tbody>${corpo}
          <tr style="font-weight:bold;">
            <td style="${celula}" colspan="3" align="right">Total Geral:</td>
            <td style="${celula}text-align:right;">R$ ${moeda(totalDebito)}</td>
            <td style="${celula}text-align:right;">R$ ${moeda(totalCredito)}</td>
          </tr>
        </tbody>
      </table>
      <h3>Saldo Atual R$: ${moeda(Number(jogador.saldo))}</h3>
    </body>
  </html>`
}

export async function enviaExtrato(jogador: any) {
  const info = await transporter.sendMail({
    from: "Arena Lan House <lanhouse@gmail.com>",
    to: jogador.email,
    subject: "Extrato de Sessões e Recargas",
    text: "Extrato de Sessões e Recargas da Arena Lan House (abra em um leitor de e-mail com HTML).",
    html: gerarExtratoHTML(jogador),
  })
  return info.messageId
}
