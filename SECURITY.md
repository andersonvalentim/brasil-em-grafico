# Segurança

## Como relatar uma vulnerabilidade

Não abra uma issue pública. Use o relato privado do GitHub:
**[Security → Report a vulnerability](https://github.com/andersonvalentim/brasil-em-grafico/security/advisories/new)**.

Conte o que encontrou, como reproduzir e qual o impacto. Respondemos assim que possível.

## O que o projeto faz para se proteger

- O site é estático: não há servidor, banco de dados, login nem coleta de dados pessoais.
- Todo texto vindo do catálogo e dos dados é escapado antes de ir para a página, e links externos só aceitam `http`/`https`.
- As páginas têm uma Política de Segurança de Conteúdo (CSP) que só permite scripts do próprio site.
- As automações (GitHub Actions) usam permissões mínimas, versões fixadas por SHA e não têm acesso a segredos em pull requests de forks.
- O coletor só lê APIs públicas oficiais e não usa chaves de acesso.

## Contribuições

Pull requests que mudam `.github/`, `scripts/`, `assets/js/` ou páginas HTML exigem revisão do mantenedor (veja `.github/CODEOWNERS`).
Nunca inclua chaves, tokens ou senhas em commits. O GitHub bloqueia o push quando reconhece um segredo.
