## Relatório: conexão da API com MongoDB

**Situação atual**

- O serviço MongoDB está instalado e rodando em `localhost:27017`.
- A API está configurada no `.env` em `ValeSenseAPI-main-main-main-main/ValeSenseAPI-main-main/ValeSenseAPI-main/FrontEnd/.env`. Os dados de administrador que você forneceu e um segredo JWT aleatório estão salvos lá. **Não compartilhe esse arquivo**; ele contém credenciais.
- A API está parada. Ao reiniciar, o Prisma não conseguiu criar o administrador porque o MongoDB está em modo standalone.
- A configuração do MongoDB não foi alterada: o Windows negou acesso administrativo ao arquivo `C:\Program Files\MongoDB\Server\9.0\bin\mongod.cfg` e ao serviço.

**O que falta fazer**

1. Abra o PowerShell **como administrador** e adicione ao final de `mongod.cfg`:

   ```yaml
   replication:
     replSetName: rs0
   ```

2. Reinicie o serviço MongoDB. No mesmo PowerShell administrativo:

   ```powershell
   Restart-Service MongoDB
   ```

3. Instale o `mongosh`, que não está disponível nesta máquina, e execute uma vez:

   ```javascript
   rs.initiate()
   ```

   Confirme com `rs.status()` que o membro está como `PRIMARY`.

4. No `.env` da API, ajuste a URI para incluir o replica set:

   ```env
   DATABASE_URL=mongodb://localhost:27017/valesense_pi?replicaSet=rs0
   ```

5. Inicie a API na pasta `FrontEnd`:

   ```powershell
   npm run dev
   ```

6. Confira `http://localhost:3333/health`. O esperado é:

   ```json
   {"status":"ok","database":"connected"}
   ```

Na inicialização, a API tentará criar o administrador com os dados já salvos no `.env`. Depois que você configurar o replica set, posso ajudar a concluir e verificar esses passos.