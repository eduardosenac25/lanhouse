# API Arena Lan House

Trabalho #2 – Desenvolvimento de Serviços e APIs (UniSenac Pelotas).
Stack: Express 5, Prisma 7 (MySQL/MariaDB), Zod, Nodemailer e Swagger.

## Models
- `jogadores` (id, nome, nick, email, obs, saldo)
- `estacoes` (id, nome, tipo, valorHora, status)
- `recargas` (id, jogadorId, valor, tipo, data)
- `sessoes` (id, jogadorId, estacaoId, horas, preco, data)

## Como rodar
1. `npm install`
2. Crie o banco `lanhouse` no MySQL/MariaDB.
3. Copie `.env.example` para `.env` e ajuste os dados do banco e do Mailtrap.
4. `npx prisma migrate dev --name criar_tabelas` (cria as tabelas e gera o client em `generated/prisma`)
5. `npm run dev` (servidor em http://localhost:3000)
6. Swagger em http://localhost:3000/docs (para regerar: `npm run swagger`)
7. Bruno: abra a pasta `bruno-lanhouse` como coleção e escolha o ambiente `local`.

## Transações
| Rota | O que acontece (tudo ou nada) |
|---|---|
| `POST /sessoes` | valida jogador e estação → ocupa a estação (se livre) → debita o saldo (se suficiente) → grava a sessão |
| `DELETE /sessoes/:id` | exclui a sessão → devolve o valor ao jogador → libera a estação |
| `POST /recargas` | grava a recarga → soma ao saldo do jogador |
| `DELETE /recargas/:id` | estorna: retira o valor do saldo (se houver) → exclui a recarga |

## Ordem sugerida de teste no Bruno
1. Criar jogador e estação → 2. Registrar recarga → 3. Abrir sessão → 4. Listar sessões →
5. Enviar extrato por e-mail → 6. Cancelar sessão (saldo volta e estação fica livre).
