# English with Natalia Bellos

Blog de uma professora particular de inglês, com materiais organizados
por aluno, publicações, acompanhamento de progresso e painel administrativo.

A interface do site está em inglês.

## Tecnologias

- React
- TypeScript
- Vite
- Styled Components
- Node.js para o serviço de comunidade
- GitHub como armazenamento versionado, sem banco de dados

## Requisitos

- Node.js 22.12 ou superior
- npm
- Git para publicar o projeto

## Executar na sua máquina

Abra o terminal na pasta do projeto:

    npm install
    npm run dev

Acesse o endereço exibido no terminal, normalmente:

    http://localhost:5173

## Primeiro acesso da professora

Crie a senha local:

    npm run admin:setup

Depois, abra Teacher login no menu superior.

Não existe uma senha padrão. As credenciais locais ficam fora dos
arquivos públicos e não devem ser enviadas ao GitHub.

## O que a professora pode editar

No painel administrativo:

- Nome do blog e da professora
- Apresentação da página About
- E-mail e Instagram
- Cadastro e informações dos alunos
- Textos, PDFs, documentos Word e imagens
- Progresso e comentários de aprendizagem
- Publicações do Teacher’s journal

Os textos fixos da Home, menus, layout e ilustração ainda são
alterados diretamente no código.

Use o botão de salvar ou publicar para confirmar as alterações.

## Acesso dos alunos

Selecione o aluno na lista e abra Student login & profile.

A professora pode criar ou redefinir a senha individual de um aluno
já salvo pelo painel local.

Também é possível configurar pelo terminal:

    npm run student:setup -- ID_DO_ALUNO

Cada aluno deve receber uma senha própria, diferente da senha
da professora.

## Personalização

O aluno pode escolher:

- Fonte de leitura
- Combinação de cores
- Foto de perfil

A seleção pode ser visualizada antes de salvar.

Fotos aceitas: JPG, PNG e WebP de até 5 MB. O site converte a imagem
em uma miniatura antes de salvar.

A sincronização entre aparelhos exige configurar o serviço de
comunidade e sua integração com o GitHub.

## Chat

O botão flutuante Chat está disponível nas páginas do blog.

Recursos:

- Conversa em tempo real
- Emojis
- Contagem de participantes conectados à sala
- Contador de mensagens não lidas
- Janela que pode ser minimizada
- Enter para enviar e Shift + Enter para quebrar linha

Os apelidos não são verificados. As mensagens são públicas e
temporárias: o histórico desaparece quando todos saem da sala
ou quando o serviço reinicia.

No site publicado, o chat exige um serviço Node.js com WebSocket.
GitHub Pages sozinho não executa esse serviço.

## Contatos

O menu possui:

- Instagram: abre o perfil configurado
- Gmail: abre o formulário da página Contact

Substitua os contatos de exemplo pelo painel da professora.

O formulário prepara uma mensagem no Gmail do visitante.
Ele precisa revisar e confirmar o envio no Gmail.

O formulário não envia e-mails automaticamente. Enquanto o endereço
de exemplo estiver configurado, o envio permanece desativado.

## Acessibilidade

O botão lateral com as mãos abre:

- Texto maior
- Alto contraste
- Acesso ao VLibras

O VLibras traduz português para Libras; ele não traduz automaticamente
a interface em inglês.

Materiais em inglês precisam de versões alternativas adequadas,
como textos em português ou vídeos em Libras.

## Arquivos e armazenamento

O conteúdo público fica principalmente em:

    public/content/manifest.json
    public/content/uploads/

O manifest guarda informações do blog, alunos, publicações,
progresso e preferências.

Os materiais são públicos. Fotos de perfil também são públicas.

Remover algo da versão atual não apaga cópias já baixadas nem
versões anteriores registradas no Git.

Nunca coloque senhas, tokens ou chaves privadas nesses arquivos.

## Publicação

Para gerar a versão de produção:

    npm run build

Para visualizar essa versão localmente:

    npm run preview

O projeto inclui um fluxo de publicação pelo GitHub Actions
para GitHub Pages.

Antes de publicar, siga a configuração completa do projeto para:

1. Criar o repositório no GitHub.
2. Configurar o GitHub Pages.
3. Configurar a GitHub App e o serviço de autenticação da professora.
4. Configurar o serviço de comunidade para chat e sincronização.
5. Cadastrar os contatos reais e revisar os materiais públicos.

Nunca grave um token pessoal do GitHub no frontend.

## Limitações atuais

- O painel local salva arquivos reais na máquina.
- A edição online depende da configuração dos serviços.
- A criação e a redefinição de senhas pelo painel funcionam localmente.
- No serviço online atual, as credenciais dos alunos são mantidas
  na configuração privada do serviço.
- O acesso online da professora usa a conta GitHub autorizada.
- O formulário de contato não possui envio automático.
- A biblioteca animada ainda não foi implementada.

## Custos

O projeto foi pensado para usar opções gratuitas, dentro dos limites
dos serviços escolhidos.

A disponibilidade contínua do chat e da sincronização depende
da hospedagem. Planos gratuitos podem suspender serviços por
inatividade e mudar suas condições.
