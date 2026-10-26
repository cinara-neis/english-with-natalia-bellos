# English with Natalia Bellos

Blog de professora particular de inglês, editável, em **React + TypeScript + Vite + Styled Components**. Nomes, textos e desenho da professora são exemplos substituíveis. Inclui PDF, DOCX e imagem reais para experimentar a coleção.

## O que está pronto

### Página interativa do aluno, aparência sincronizada e chat

Na página de cada aluno há **Your space, your style**, com quatro fontes e cinco fundos de cores. A seleção dá uma prévia imediata, sem fingir gravação. Para sincronizar entre aparelhos, o aluno entra com sua própria senha e usa **Save appearance across devices**. A aparência salva é pública e afeta a página desse aluno; só a conta correspondente pode alterá-la. Preferências de acessibilidade gerais do dispositivo continuam separadas.

O aluno não recebe acesso à professora: os serviços de autenticação são separados, e a API estudantil só pode gravar `students[ID_DA_SESSAO].appearance`, com valores pré-definidos. Ela não aceita código CSS, URLs, uploads, edição de documentos, alunos, posts ou progresso. Nenhuma senha padrão ou conta de aluno foi criada nesta entrega.

**Preparar um aluno no computador:** no painel da professora, selecione o aluno e consulte o ID em **Separate student sign-in**. No terminal do projeto, execute, por exemplo:

```sh
npm run student:setup -- ana
```

O comando pede uma senha de 12–256 caracteres, com digitação oculta, e guarda somente salt/hash scrypt em `.student-auth/accounts.json`. Use senhas diferentes da professora. O arquivo é privado, ignorado pelo Git, negado pelo servidor web e excluído do pacote de entrega. Entregue a senha ao aluno fora do chat público. Trocar a senha invalida as sessões desse aluno na próxima operação. Sessões ficam só em memória e expiram em uma hora.

Durante `npm run dev`, o serviço real de comunidade funciona no mesmo Vite: fontes e fundos são salvos no manifest do projeto e podem ser carregados por outra sessão autenticada. Isso permite testar dois navegadores/abas no mesmo computador. Para aparelhos distintos acessarem os mesmos dados pela internet, configure o serviço hospedado abaixo; `localhost` não é um endereço compartilhado entre aparelhos.

O **Live classroom chat** tem uma sala geral na Home e uma sala pública por página de aluno. A pessoa escolhe um apelido e clica **Join live chat**. Somente conexões WebSocket ativas nessa sala entram na contagem; abrir a página sem entrar no chat não conta. Apelidos não verificam identidade e nunca recebem privilégio de professora. Não são mensagens privadas. Cada mensagem tem até 500 caracteres, com limite de frequência no servidor. O histórico fica somente em memória, até 50 mensagens por sala, e desaparece quando a sala esvazia ou o servidor reinicia. Não há banco de dados nem histórico persistente do chat.

#### Publicar a comunidade sem banco de dados

O GitHub Pages continua hospedando o blog. O serviço Node em `server/start.mjs` mantém as conexões ao vivo e grava apenas as preferências no JSON versionado do GitHub. Uma opção é um **Web Service Free do Render**: [WebSockets](https://render.com/docs/websocket) e [limites do plano gratuito](https://render.com/docs/free). Selecione explicitamente o plano Free, sem disco ou banco. O serviço gratuito pode dormir por inatividade, demorar a acordar, reiniciar e sofrer limites de uso; não há garantia de disponibilidade contínua nem de gratuidade permanente. Não são usados pings artificiais para contornar a suspensão.

1. Após criar o repositório do blog, conecte-o a um Web Service Node no Render. Build command: `npm ci --omit=dev`. Start command: `npm run community:start`. Health check: `/__community/health`. Use Node 22.12 ou superior.
2. Defina `ALLOWED_ORIGINS` com a origem exata do blog, sem caminho, por exemplo `https://SEU_USUARIO.github.io`. Múltiplas origens explícitas podem ser separadas por vírgula. Não use `*`.
3. Para sincronizar preferências, utilize a GitHub App restrita ao repositório do blog, com **Contents: read and write** e **Metadata: read**. Na configuração dessa App, gere uma chave privada PEM e guarde-a somente no serviço. A sincronização usa um token de instalação temporário, sem token pessoal de acesso.
4. Configure no serviço, como variáveis/segredos: `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH=main`, `GITHUB_APP_ID` (App ID, não Client ID), `GITHUB_INSTALLATION_ID`, `GITHUB_PRIVATE_KEY` (PEM completo). O installation ID pode ser encontrado na página da instalação da App, no final do endereço `github.com/settings/installations/NUMERO`. A chave privada é obtida nas configurações da App, em Private keys. Nunca coloque esses segredos em variáveis `VITE_*` ou commits.
5. Crie as senhas locais dos alunos e copie o conteúdo de `.student-auth/accounts.json` para o segredo `STUDENT_ACCOUNTS_JSON` do serviço hospedado. Atualize esse segredo ao cadastrar ou trocar senhas. Não publique o arquivo e não use a senha da professora para alunos. Esta versão tem provisionamento de contas pela responsável, sem cadastro público de usuários ou recuperação por e-mail.
6. No GitHub Actions, crie a variável pública `VITE_COMMUNITY_URL=https://SEU_SERVICO.onrender.com` e rode o deploy do Pages. No desenvolvimento, essa mesma variável em `.env.local` permite apontar para o serviço hospedado em vez do serviço local. O JSON só muda ao salvar explicitamente; cada alteração online gera um commit e pode acionar o deploy do Pages.

O chat pode funcionar com apenas a origem permitida configurada. A sincronização precisa também das contas e da GitHub App. Sem `VITE_COMMUNITY_URL` na build pública, a interface informa que o serviço ainda não foi configurado e não mostra contagens fictícias. A configuração de exemplo está em `server/.env.example`; ela é documentação, não é carregada automaticamente como segredo pelo servidor.

O serviço usa uma única instância: não replique horizontalmente sem mudar a arquitetura de presença. Contas são configuração privada do serviço, as aparências ficam no GitHub, e salas, mensagens, tickets e sessões ficam em memória. Um reinício encerra as conexões e sessões, mas as preferências já gravadas no GitHub continuam. Erros ou conflitos de gravação são informados, sem confirmar um salvamento que falhou.

**Verificação desta atualização:** o teste `npm run test:community` verificou persistência real entre duas sessões, escopo por aluno, bloqueio de escrita sem login, opções de aparência, origem e logout. No navegador local, duas abas WebSocket reais trocaram mensagem e atualizaram presença de 2 para 1; ao esvaziar a sala, a próxima entrada não recebeu mensagens antigas. A prévia de fonte e fundo foi conferida visualmente. Nenhuma hospedagem externa ou conta/senha real foi provisionada; o login real de alunos fica pendente até a configuração das senhas pela professora.

### Painel local na sua máquina

Com `npm run dev` e `VITE_ADMIN_API` vazio, abra `http://127.0.0.1:5173/#/admin` (use a porta informada pelo Vite). O painel exige autenticação da professora. Na primeira utilização, execute `npm run admin:setup` no terminal da pasta do projeto e crie uma senha de 12 a 256 caracteres. A digitação fica oculta. Depois, recarregue o painel e entre em **Sign in as teacher**. Sem essa configuração, a edição permanece bloqueada:

1. Selecione o aluno em **Choose a student**. Se necessário, cadastre um aluno em **Our students**.
2. Em **Add a material for [nome]**, escolha o documento e clique em **Add to draft**.
3. Clique em **Save to project**. O arquivo é gravado em `public/content/uploads/` e o vínculo com o aluno em `public/content/manifest.json`.
4. Recarregar o blog mantém os dados salvos. Para mudar de aluno, o formulário de documento é limpo, evitando enviar o arquivo para o aluno errado.

Este é um salvamento real nos arquivos locais, sem banco, com senha local verificada pelo servidor e sem simulação em localStorage. Ainda não publica online: para atualizar o site público, envie os arquivos alterados ao GitHub ou use a integração abaixo. O endpoint local existe somente durante `npm run dev`; `npm run preview` e a build de produção não oferecem escrita local. Não exponha o servidor de desenvolvimento na internet.

Após atualizar o código, se ainda aparecer **No-backend mode**, pare o servidor e execute `npm run dev` novamente na pasta deste projeto, depois recarregue a página. Para usar a integração GitHub durante o desenvolvimento, preencha `VITE_ADMIN_API` e reinicie o Vite.

### Acesso restrito à professora

- **Local:** execute `npm run admin:setup` para criar a senha, sem informá-la no chat nem colocá-la em variáveis `VITE_*`. Não há senha padrão. O servidor armazena somente salt e hash scrypt em `.local-admin/credentials.json`, fora de `public`, ignorado pelo Git, bloqueado no servidor web e excluído do ZIP.
- O painel não faz mais login automático. Antes da autenticação, não monta os formulários de cadastro, upload, progresso ou posts. Chamadas diretas às operações locais de leitura administrativa e gravação retornam 401 sem uma sessão válida.
- A sessão local usa um identificador aleatório mantido só na memória do navegador e do servidor por até uma hora. Sair revoga essa sessão; recarregar descarta a credencial do navegador. Reiniciar o servidor invalida as sessões. Reexecutar `admin:setup` troca a senha e invalida as sessões anteriores. Cinco tentativas de senha incorreta bloqueiam novas tentativas por 15 minutos nesse servidor.
- **Online:** a GitHub App e o Worker verificam, no servidor, que o login corresponde a `ALLOWED_LOGIN` e tem acesso de escrita ao repositório. Configure exclusivamente a conta da professora. Uma conta diferente não recebe uma sessão administrativa. Não há fallback online para a senha local e não há modo de demonstração que libere edição.
- Qualquer visitante pode encontrar o endereço `/#/admin` e a tela de entrada, pois o blog é público e estático; isso não concede acesso aos formulários ou às operações protegidas. Esconder o link não é o mecanismo de proteção. Os materiais, posts e progresso publicados continuam públicos conforme o funcionamento do blog.

### Entrada da professora, progresso e textos na Home

O menu superior tem **Teacher login**, além de Home/About/Contact. Esse botão abre o painel do próprio blog em `/#/admin`; no modo online configurado, a professora usa **Sign in with GitHub**, autoriza a App e depois faz as alterações no painel. Ela não precisa editar código nem entrar diretamente nos arquivos do repositório para usar esse fluxo. A seção **Teacher access** mostra o endereço do painel e **Open blog repository** quando o repositório estiver configurado. O endereço localhost funciona somente na máquina que está executando o projeto; não é o link online para compartilhar.

Na Home, **Our learning progress** mostra os alunos e suas metas. Ao selecionar um aluno, aparece somente a régua dele. No painel, selecione o aluno e use **Learning progress → Set a learning goal** para preencher meta, percentual de 0 a 100 e comentário. O percentual é uma avaliação manual da professora sobre aquela meta, não uma medição automática de proficiência nem um contador de downloads. Sem avaliação, a régua aparece vazia com **Not assessed yet**. Não foram inventados percentuais para os alunos cadastrados.

Em **Homepage posts → Write on the homepage**, a professora pode escrever, editar e excluir textos que aparecem em **Teacher’s journal** para todos os visitantes. Esses posts são independentes dos textos de atividade vinculados a um aluno. O texto é renderizado como texto simples, com quebras de linha, sem executar HTML.

Depois de editar progresso, posts ou documentos, use **Save all to project** no modo local ou **Publish all changes** no modo GitHub. Há também o botão de salvar ao final do formulário. A gravação persiste `students[].progress` e `posts[]` no manifest, junto com os demais dados. No modo GitHub, espere o deploy terminar para ver a atualização no site público. Esses campos são opcionais, então manifests antigos continuam válidos.

Sem dono/repositório e GitHub App configurados, não existe um link online autenticado pronto para compartilhar. O projeto exibe essa situação explicitamente, sem inventar um endereço ou oferecer um login que não funciona.

- Home / About / Contact, lista lateral de alunos, pesquisa e filtro de materiais.
- Textos, PDFs e imagens na mesma página; DOCX com prévia de texto (sem reproduzir a diagramação). DOC legado tem download para Word/LibreOffice. PDFs dependem do visualizador do navegador e sempre têm link para baixar.
- Painel `/#/admin`: login GitHub, alunos, textos, upload, exclusão e configurações do blog. O hash permite acesso direto no GitHub Pages sem servidor de rotas. O arquivo `404.html` redireciona também o acesso direto `https://USUARIO.github.io/REPO/admin` para a rota do painel. Prefira os links internos com hash, que não dependem desse redirecionamento.
- Manifest versionado e arquivos no GitHub; publicação atômica em um commit, conflitos detectados, deploy automático pelo Actions.
- Nenhum banco, nenhuma persistência simulada de conteúdo em localStorage e nenhum token pessoal no frontend.

## A escolha necessária: zero custo não significa zero serviço

**Opção A, painel integrado (implementada):** GitHub Pages público + GitHub App + Cloudflare Worker no plano Free. O Worker é um pequeno backend **sem banco de dados** que faz a troca OAuth e grava no GitHub em nome da professora. É preciso criar/configurar essas contas e a App. Dentro dos limites gratuitos, não há custo de hospedagem nem domínio obrigatório. Não selecione plano pago nem registre domínio para este projeto.

**Opção B, zero backend (também disponível):** deixe `VITE_ADMIN_API` vazio. Sem a integração online, os formulários online ficam bloqueados; a manutenção manual pode ser feita na interface autenticada do próprio GitHub. Os visitantes continuam usando o blog normalmente. As alterações acontecem no GitHub, não no formulário do blog. GitHub Pages só serve arquivos estáticos e não guarda segredos nem processa uploads autenticados por conta própria.

Não há conta GitHub/Cloudflare conectada neste projeto entregue: autenticação real e deploy precisam da configuração abaixo. Não há botão fingindo salvar. Não foi realizada publicação externa.

## 1. Rodar no computador

Use Node.js **22.12 ou superior** e npm.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

No PowerShell, copie com `Copy-Item .env.example .env.local`. Abra o endereço impresso pelo Vite. Deixe `VITE_BASE_PATH=/` no desenvolvimento. A build de produção do Actions configura o prefixo do repositório automaticamente.

```sh
npm test
npm run worker:check
npm run build
npm run preview
```

## 2. Publicar grátis no GitHub Pages

1. Crie um repositório **público** na sua conta GitHub, por exemplo `english-with-natalia-bellos`, com branch `main`.
2. Envie **o conteúdo desta pasta**, incluindo `.github`, `worker`, `shared`, `src`, `public`, `package.json` e `package-lock.json`. Não envie `node_modules`, `dist`, `.env.local`, `.dev.vars` ou segredos.
3. No repositório, abra **Settings → Pages → Build and deployment → Source → GitHub Actions**.
4. Em **Actions**, execute ou aguarde **Validate and deploy to GitHub Pages**. O workflow testa, compila e publica `dist`.
5. O site ficará em `https://USUARIO.github.io/english-with-natalia-bellos/`. Use o URL que o job de deploy mostrar.
6. Para o repositório especial `USUARIO.github.io` ou domínio próprio, configure **Settings → Secrets and variables → Actions → Variables → VITE_BASE_PATH = /**. Para um repositório comum, o prefixo `/NOME-DO-REPO/` já é automático.

Sem o Worker, o blog já funciona em modo público e o painel fica bloqueado até a configuração de autenticação. O Actions preenche dono e nome do repositório automaticamente. Branch diferente de `main` exige alterar o workflow e as configurações do Worker/frontend.

## 3. Habilitar o painel integrado com GitHub App

### Criar e instalar a App

Na conta da professora, vá a **Settings → Developer settings → GitHub Apps → New GitHub App**:

- Nome: único, por exemplo `English Clara Admin SEUUSUARIO`.
- Homepage: endereço final do blog.
- Callback URL: `https://english-teacher-admin.SEUSUBDOMINIO.workers.dev/auth/callback` (ajuste ao endereço efetivo do seu Worker).
- Desative Webhooks. Não é preciso gerar chave privada: esta implementação usa o fluxo OAuth de usuário da GitHub App.
- Repository permissions: **Contents: Read and write** e **Metadata: Read-only**. Nenhuma permissão de Actions, Workflows, administração ou conta.
- Mantenha habilitada a expiração de user access tokens. O serviço usa uma sessão de até 1 hora e exige novo login em vez de armazenar refresh tokens.
- Instale a App **somente no repositório do blog**, com a conta que tem escrita nele. Para uso pessoal, restrinja a instalação à sua conta.
- Copie o **Client ID** (não o App ID) e gere um **Client secret**. O secret será salvo apenas no Worker.

### Configurar o Worker

Crie conta Cloudflare gratuita e use **Workers Free**. Nenhum KV, D1, R2 ou cartão é exigido por este código. O CLI Wrangler está nas dependências.

Edite `worker/wrangler.toml`:

```toml
FRONTEND_URL = "https://SEU_USUARIO.github.io/english-with-natalia-bellos/"
GITHUB_OWNER = "SEU_USUARIO"
GITHUB_REPO = "english-with-natalia-bellos"
GITHUB_BRANCH = "main"
GITHUB_CLIENT_ID = "CLIENT_ID_DA_APP"
ALLOWED_LOGIN = "LOGIN_GITHUB_DA_PROFESSORA"
```

O endereço deve corresponder exatamente ao site. O CORS permite somente a origem configurada; uma única conta, definida no servidor por `ALLOWED_LOGIN`, pode administrar. Não deixe placeholders.

```sh
npx wrangler login
npx wrangler secret put GITHUB_CLIENT_SECRET --config worker/wrangler.toml
npx wrangler secret put SESSION_SECRET --config worker/wrangler.toml
npm run worker:deploy
```

Quando solicitado, cole os respectivos segredos no terminal. Para gerar uma chave de sessão, rode localmente e copie o resultado para `SESSION_SECRET`:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Nunca coloque esses valores em variáveis `VITE_*`, commits, screenshots ou no GitHub Pages. Confirme que a Callback URL da App coincide com o URL efetivo retornado pelo deploy do Worker mais `/auth/callback`.

No GitHub, em **Settings → Secrets and variables → Actions → Variables**, defina:

```text
VITE_ADMIN_API = https://english-teacher-admin.SEUSUBDOMINIO.workers.dev
```

É uma variável pública, não um segredo. Execute o workflow Pages de novo. Para usar o painel no desenvolvimento local, defina `VITE_ADMIN_API` em `.env.local` e use uma configuração/Worker de desenvolvimento separado com `FRONTEND_URL=http://localhost:5173/` (ou o endereço local exato do navegador), Callback HTTPS correspondente e as mesmas permissões mínimas. Não afrouxe CORS em produção.

### Usar

1. Abra o blog e **Teacher’s desk**, ou `/#/admin` com o prefixo do repositório.
2. Clique **Sign in with GitHub**, permita a janela de login e autorize a App instalada.
3. Cadastre um aluno; selecione-o; adicione um texto ou arquivo ao rascunho. Pode editar o nome e o nível do aluno, o nome do blog, About e e-mail.
4. Clique **Publish changes**. Só a resposta bem-sucedida do GitHub confirma gravação.
5. Acompanhe o link **GitHub Actions** e espere o deploy terminar. A página pública usa o último build publicado, não o rascunho do painel. Recarregue-a depois do deploy.

Fechar, recarregar ou sair encerra a sessão em memória; rascunhos não publicados serão perdidos. Se a sessão expirar ou houver conflito, copie os textos antes de sair e entrar de novo. Após conflito, não há sobrescrita automática. Reaplique sobre a versão atual. Se a rede cair depois de confirmar o commit, confira o histórico antes de repetir: a operação pode ter sido concluída.

## 4. Alternativa sem backend: procedimento seguro

Deixe `VITE_ADMIN_API` vazio. No próprio GitHub, usando o seu login:

1. Faça upload em `public/content/uploads/`. Use nomes únicos simples, como `atividade-2026-10-21.pdf`, sem espaços.
2. Edite `public/content/manifest.json`. Copie uma estrutura de aluno existente e use IDs únicos. Exemplo de material:

```json
{
  "id": "lesson-001",
  "title": "My first lesson",
  "kind": "pdf",
  "date": "2026-10-21",
  "path": "content/uploads/atividade-2026-10-21.pdf"
}
```

3. Para texto, use `kind: "text"`, `text: "Seu texto..."` e omita `path`. Para Word: `docx`/`doc`; imagem: `image`. Alunos precisam de `id`, `name`, `level` e `materials`.
4. Ao excluir, remova a referência no JSON e o arquivo no GitHub. Publique somente quando os dois estiverem coerentes. O workflow valida o manifest e a existência dos arquivos; uma alteração incompleta não substitui o site publicado.
5. Faça commit na main; aguarde o Pages. Nenhuma credencial é solicitada no frontend.

## Segurança e limites deliberados

- GitHub App OAuth com `state`, PKCE S256 e cookie HttpOnly/Secure/SameSite=Lax para a transação. O client secret e o token GitHub nunca são entregues em claro ao frontend.
- O Worker encapsula o token de usuário em uma credencial cifrada AES-GCM, válida até 1 hora. O navegador mantém essa credencial **apenas na memória**, sem localStorage, URL ou cookie de sessão cross-site. Ela ainda é uma credencial sensível: scripts maliciosos na mesma origem poderiam usá-la. Não inclua scripts de terceiros. Evite hospedar apps não confiáveis no mesmo domínio `USUARIO.github.io`.
- O login usa popup e `postMessage` com origem/destinatário fixos e verifica a janela emissora. Bloqueadores ou políticas que rompem `window.opener` podem impedir o fluxo; nesse caso use a edição pelo GitHub. Não existe bypass de login.
- Cada leitura/gravação autenticada revalida usuário e acesso ao repositório no GitHub. Revogar a App no GitHub invalida chamadas futuras. Sair descarta a credencial local; sem banco não existe lista de sessões revogadas. Para invalidar todas as sessões cifradas, rotacione `SESSION_SECRET`; para revogar o acesso da App, remova a autorização/instalação no GitHub.
- O servidor fixa dono, repositório, branch, conta permitida e caminhos. Só altera manifest e arquivos em `public/content/uploads`; não pode editar código nem workflows pelo painel. Não solicite permissão Workflows.
- Até **2 MiB por arquivo, 5 arquivos por publicação**, 100 alunos e 200 materiais/aluno, manifest de até 700 KB. São limites conservadores do app; não uma garantia de capacidade do serviço. Mantenha uso pequeno e acompanhe as quotas. Conteúdo e extensão são conferidos por assinatura básica; isso **não é antivírus**, e DOCX é validado apenas como contêiner ZIP. Envie apenas documentos confiáveis.
- SVG, HTML e executáveis não são aceitos como uploads. O desenho SVG da professora é um asset confiável editado no código. A prévia DOCX extrai somente o XML de texto com fflate (até 4 MiB descompactados), sem carregar relacionamentos externos ou HTML. Textos são sempre escapados pelo React.
- Apagar não apaga histórico Git, caches ou cópias já baixadas. Não publique informações privadas dos alunos. Os alunos de exemplo são fictícios.
- Uma branch protegida que exige PR pode recusar a gravação: o painel publica diretamente na branch configurada e não cria PRs. Para esse caso, use o fluxo manual do GitHub/PR.
- A App usa um user token, portanto commits podem acionar o workflow; não usa `GITHUB_TOKEN` para as alterações do painel. Falha do deploy deixa o commit salvo, mas o site público na versão anterior. Confira o Actions.
- GitHub Free oferece Pages para repositórios públicos. Pages tem limites de tamanho e banda; Workers Free tem quotas de requisições e CPU. A gratuidade depende de manter o uso nos planos gratuitos. Não se promete armazenamento ilimitado ou gratuidade permanente das plataformas.

## Estrutura

```text
src/App.tsx                       layout e navegação pública
src/components/Admin.tsx          painel e rascunho em memória
src/components/MaterialViewer.tsx prévias acessíveis
src/styles.ts                     Styled Components e tema visual
src/lib.ts                        leitura e cliente da integração
shared/content.ts                 tipos e validação compartilhados
public/teacher.svg                ilustração vetorial original substituível
public/content/manifest.json      catálogo versionado
public/content/uploads/           arquivos públicos
worker/index.ts                   OAuth, autorização e commits GitHub
worker/wrangler.toml              configuração pública do serviço
.github/workflows/pages.yml       teste, build e deploy automático
tests/                           validação e cenários do servidor
```

Troque a ilustração em `public/teacher.svg` ou ajuste o caminho em `src/App.tsx`. As cores e espaçamentos ficam em `src/styles.ts`. O Worker é publicado separadamente; alterações nele exigem novo `npm run worker:deploy`.

## Interface em inglês e acessibilidade

### Layout responsivo

Em telas estreitas, a professora e o nome do blog ficam compactos e **Students and materials** expande a lista de alunos. Ao selecionar um aluno no celular, a lista recolhe e o foco vai para o conteúdo. Em telas largas, a lista fica visível na lateral.

O menu superior quebra em duas colunas em celulares pequenos. Cartões usam uma grade fluida; cabeçalhos, ações, formulários e rodapé permitem quebra de linhas. Inputs usam texto de pelo menos 16 px no tamanho padrão para evitar zoom automático no iPhone. O botão de salvar deixa de ser fixo em telas baixas ou estreitas; prévias respeitam a altura dinâmica da tela. O zoom do navegador permanece habilitado.

A revisão no navegador local verificou larguras de **320, 375, 768, 1024, 1440 e 1920 px**, além de **844 × 390 px** em paisagem, sem rolagem horizontal nessas medidas, inclusive com **Larger text** ativo. Também foram verificados a lista expansível, a seleção de aluno, a entrada protegida e o modal de imagem em celular. O modal coube na tela, fechou com Escape e devolveu o foco à ação de origem. Isso não equivale a testar todos os aparelhos, navegadores, documentos enviados ou formulários autenticados com a senha real da professora.

A interface pública, o painel, os avisos, os erros e os exemplos estão em inglês, com `lang="en"`. Nomes próprios permanecem como cadastrados. Documentos enviados pela professora não são traduzidos automaticamente.

- **Accessibility → Larger text** aumenta o texto em 25%, usando unidades relativas. **High contrast** ativa fundo preto, texto branco e links amarelos. **Reset display** restaura o padrão. Somente essas preferências visuais ficam em localStorage; conteúdo, login e tokens não são persistidos ali.
- **Skip to main content**, foco visível e navegações nomeadas ajudam a usar o blog por teclado e leitor de tela. Filtros informam o estado selecionado; resultados da busca são anunciados sem mover o foco. Mudanças de página levam o foco ao conteúdo principal.
- Botões e principais ações têm área de toque de pelo menos 44 px. O layout permite quebra de linhas, aumento de texto e configuração de movimento reduzido do sistema.
- A prévia usa o elemento nativo `dialog` com `showModal`: o navegador torna o fundo inativo, controla a sequência de foco e envia cancelamento ao pressionar Escape. Ao fechar, o foco retorna ao botão de origem. Os controles de PDF incorporado também dependem do visualizador do navegador.
- Formulários têm rótulos associados, instruções de upload e anúncios de progresso/erro. Imagens informativas exigem **Image description**. Na edição manual do manifest, cada material `kind: "image"` precisa de `alt`, com uma descrição em inglês de até 1.000 caracteres.
- Use PDFs com texto selecionável, marcação e ordem de leitura; Word com títulos estruturados e descrições de imagens. O site não corrige documentos inacessíveis automaticamente.

Os testes incluem auditoria axe-core da página inicial, painel autenticado e modal, além de teclado, foco, pesquisa e preferências. O ambiente de testes simula a API do dialog e não substitui um navegador real. Contraste foi conferido numericamente para as combinações de texto principais; a regra de contraste do axe fica desativada no ambiente sem layout.

Antes de publicar, revise em navegador real: Tab/Shift+Tab e Escape, zoom de 200%, tela de 320 px, texto ampliado e alto contraste, NVDA ou VoiceOver, leitura e download dos documentos. A revisão visual e com leitor de tela real ainda está pendente neste ambiente. Esta entrega não afirma certificação ou conformidade integral com WCAG.

Referências: [W3C — modal dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) e [W3C — tamanho dos alvos](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

## Fontes oficiais e operação

- [GitHub App: gerar token de usuário e fluxo web com PKCE](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app)
- [Limites e disponibilidade do Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [Workflow personalizado para Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Atualização de referência Git sem force](https://docs.github.com/en/rest/git/refs#update-a-reference)
- [Limites do Workers](https://developers.cloudflare.com/workers/platform/limits/)
- [Preços e plano gratuito Workers](https://developers.cloudflare.com/workers/platform/pricing/)

Consulte os limites atuais antes de ampliar o uso. O teste local valida a implementação; não comprova autorização real da sua App nem um deploy externo, que dependem das suas contas.

## Verificação desta entrega

Em 21/10/2026, foram aprovados:

- **20 testes**: catálogo e arquivos reais, DOCX, conta permitida, origem, OAuth/PKCE, credencial adulterada, sessão expirada, upload e exclusão em commit único, conflito e upload ausente.
- Checagem TypeScript do frontend e do Worker.
- Build Vite com prefixo `/english-with-natalia-bellos/`, equivalente ao Pages de projeto.
- Empacotamento Wrangler em `--dry-run`, sem publicação.
- Auditoria do instalador após a substituição da dependência Word: **zero vulnerabilidades conhecidas** naquele momento.

As chamadas GitHub nos testes são simuladas para verificar os contratos e erros do código; não constituem um login real. A validação visual/interativa no navegador não foi concluída porque o navegador do ambiente não conseguiu acessar o servidor local. Nenhum repositório, GitHub App ou Worker real foi criado, autorizado ou publicado nesta entrega.

Na atualização do painel local, a checagem TypeScript passou e uma verificação direta em uma pasta de teste confirmou upload real, vínculo com o aluno, leitura após salvar, exclusão do arquivo, rejeição de conflito e rejeição de origem externa. A repetição da suíte Vitest ficou bloqueada por permissões ao renomear seus arquivos temporários; os testes locais adicionados estão em `tests/local-admin.test.ts`.

A atualização de autenticação local foi verificada diretamente com bloqueio antes do login, senha incorreta, sessão válida, proteção do arquivo de credenciais, gravação autenticada, token inválido e logout. A configuração de uma senha real fica a cargo da professora; nenhuma senha padrão foi criada.


## Libras (VLibras)

No botão azul fixo com duas mãos, no canto inferior direito, abra Accessibility, depois Libras — Brazilian Sign Language e clique em Enable VLibras. O painel mantém o foco do teclado, fecha com Escape e devolve o foco ao botão. O script oficial é carregado sob demanda e requer internet. O widget inicializa automaticamente; não há token, cadastro ou persistência simulada. Falhas de carregamento exibem uma opção de tentar novamente.

O serviço traduz português brasileiro para Libras, não inglês. A interface continua em inglês; um guia opcional em português está marcado com lang=pt-BR para uso com o tradutor. Para aulas em inglês, publique também material em português ou vídeos em Libras. O widget não torna automaticamente PDFs, Word ou imagens acessíveis: forneça equivalentes textuais e conteúdo acessível.

Integração oficial: https://www.vlibras.gov.br/doc/widget/installation/webpageintegration.html


## Foto do aluno

Selecione o aluno, entre com a senha individual e use Your profile photo. Escolha JPG, PNG ou WebP de até 5 MB; a prévia recorta o centro e converte para JPEG de 96×96, removendo os metadados do arquivo original. Clique Save appearance across devices para publicar, ou Remove profile photo e salve para retirar a foto atual.

A foto é pública e fica no campo appearance.photo do manifest versionado como miniatura JPEG (até 6000 caracteres). Não enviamos o arquivo original. O servidor valida o formato e o limite e identifica o aluno pela sessão, nunca pelo ID enviado. A remoção não apaga versões anteriores do Git. Localmente usa o arquivo real do projeto; para sincronizar entre aparelhos no site publicado é necessário configurar o serviço de comunidade e a GitHub App descritos acima. Sem configuração não há envio simulado.


### Chat com emojis

Após Join live chat, o botão Emojis abre 16 opções com nomes acessíveis. A seleção insere o emoji na posição do cursor respeitando o limite de 500 caracteres. Enter envia; Shift + Enter insere uma nova linha. As próprias mensagens aparecem como You em um balão à direita. A rolagem acompanha mensagens novas somente quando a pessoa está perto do fim da conversa. Tudo usa a conexão real existente, sem serviços de emojis externos ou histórico persistente.


O chat agora abre pelo botão flutuante Chat, ao lado da acessibilidade, em todas as páginas. A janela pode ser minimizada sem encerrar uma conexão já iniciada; mensagens recebidas enquanto minimizada são contadas no botão. Leave chat encerra a conexão. Navegar entre Home, About, Contact e admin mantém a conexão da sala atual. Selecionar outro aluno muda de sala. A janela cabe na tela com rolagem interna e fecha com Escape, retornando o foco ao botão.


## Contatos e formulário

Os ícones no menu abrem o perfil Instagram e o formulário Contact. Os valores iniciais são exemplos: Instagram /example/ e natalia.bellos@example.com. Troque ambos no admin (Public contact email e Instagram profile URL) e salve. O formulário permanece sem envio enquanto usar @example.com. Com um email real, prepara uma mensagem no Gmail do visitante; ele revisa e envia na nova aba. Não há envio automático nem credenciais de Gmail no frontend. Para envio direto no site será necessário configurar um serviço de email.

O contador vermelho sobre o botão mostra mensagens recebidas enquanto o chat está minimizado, apenas após entrar na sala. Abrir a conversa zera o contador. Não são notificações push: sem conexão ou com a página fechada, não há recebimento nem histórico offline.


## Primeiras senhas e recuperação

No admin local, a professora seleciona um aluno já salvo e usa Create or reset student password. Ela define e confirma uma senha com no mínimo 12 caracteres e a entrega ao aluno por um meio privado. A senha nunca é exibida ou gravada no manifest público; somente salt e hash ficam em .student-auth/accounts.json, fora do ZIP e do Git. Redefinir invalida sessões anteriores. O link Forgot your password? do aluno orienta procurar a professora; não simula email de recuperação.

A professora autenticada pode usar Change teacher password, informando a senha atual; a troca encerra todas as sessões. Se esquecer a senha local, o dono do projeto executa npm run admin:setup no computador. Na versão publicada, a recuperação da professora é pelo GitHub. As mudanças de senha dos alunos no painel são implementadas para o editor local; no serviço online atual, STUDENT_ACCOUNTS_JSON é um segredo de configuração, e sua atualização ainda precisa ser feita pelo responsável pelo serviço. O painel publicado informa essa restrição e não apresenta uma falsa gravação.
