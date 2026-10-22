# ValeSense

Frontend estático e API Express/TypeScript conectados ao MongoDB via Prisma.

## Configuração

1. Instale Node.js LTS e MongoDB. Configure o MongoDB como replica set, pois a recuperação de senha usa transações.
2. Copie `.env.example` para `.env` e configure `DATABASE_URL` com a conexão MongoDB. Gere um `JWT_SECRET` aleatório com pelo menos 16 caracteres. Não coloque credenciais no frontend.
3. Instale dependências (`npm ci`), gere o Prisma Client (`npm run db:generate`) e sincronize as collections e índices (`npm run db:push`).
4. Inicie a API com `npm run dev`.
5. Sirva esta pasta por HTTP (por exemplo, Live Server em `http://localhost:5500`) e abra a tela de login. Não abra os arquivos HTML usando `file://`.

O Prisma não oferece migrations para MongoDB; alterações de estrutura são sincronizadas com `npm run db:push`. `banco.sql` e as migrations existentes são referências exclusivas da antiga configuração PostgreSQL e não devem ser aplicadas ao MongoDB. A troca de banco não migra os dados existentes: exporte, converta e importe os dados separadamente se precisar preservá-los.

### Alterações futuras no banco

Edite `prisma/schema.prisma` e mantenha IDs e referências MongoDB como `String @db.ObjectId`. Antes de sincronizar, execute `npm run db:validate`, `npm run db:generate`, `npm run check` e `npm run build`. Faça backup antes de `npm run db:push` e revise qualquer aviso de alteração destrutiva. Mudanças que removem ou renomeiam campos precisam de um plano/script de migração de dados: o MongoDB não mantém histórico de migrations do Prisma nem converte dados automaticamente. Atualize também os validadores e contratos da API ao alterar IDs ou campos.

O administrador inicial é opcional e usa `ADMIN_NAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD`. O backend cria o usuário no primeiro início somente se ainda não existir.

`CORS_ORIGIN` aceita origens separadas por vírgula; o valor de exemplo contempla `localhost:5173` e Live Server em `localhost:5500` ou `127.0.0.1:5500`. Inclua a origem exata usada pelo navegador.

## Dados expostos pela API

- `POST /api/auth/register` e `POST /api/auth/login`: cadastro e autenticação persistidos em `usuario`.
- `GET /api/weather-data?dias=7`: leituras reais de `leitura_climatica` vinculadas aos sensores e talhões.
- `GET /api/market-data?dias=365`: valores cadastrados em `dado_mercado`.
- `GET /api/sensors` e `GET /api/forecasts`: sensores e previsões persistidos.
- `GET/PUT /api/users/me/configuration`: preferências do usuário persistidas em `configuracao`.
- Rotas `/api/users`: perfil e administração de usuários; operações administrativas exigem perfil de administrador.
- `GET /health`: confirma disponibilidade da API e conexão com o MongoDB.

As tabelas de leituras, preços, previsões, propriedades e talhões começam vazias. Cadastre esses dados antes de esperar valores no dashboard. A tabela `previsao` armazena tipo, datas e confiança, mas não valores numéricos de produção; por isso a interface mostra as previsões cadastradas, em vez de inventar uma série “previsto x real”. O schema não guarda previsão meteorológica, dados de vento ou coordenadas das propriedades e talhões; essas informações não são exibidas como se fossem reais. Para criar sensores pelo Administrador, primeiro cadastre a propriedade e o talhão correspondentes. A tabela de exportações não existe no schema, então o histórico dessa aba permanece indisponível até que esse contrato seja definido.
