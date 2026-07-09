# @posturare/shared

Componentes de UI (baseados em shadcn/ui + Radix) e utilitários (máscaras, CEP, status de anamnese)
compartilhados entre `posturare-crm` e `posturare-app`.

## Uso

Nos projetos consumidores (`posturare-crm`, `posturare-app`), adicione no `package.json`:

```json
"dependencies": {
  "@posturare/shared": "github:Fernando-fdconsulting/posturare-shared#main"
}
```

E rode `npm install`. Para puxar uma atualização depois de um `git push` neste repo:

```bash
npm update @posturare/shared
```

## Conteúdo

- `src/ui/` — Button, Input, Label, Card, Checkbox, Progress (shadcn/ui)
- `src/lib/utils.js` — `cn()` (clsx + tailwind-merge)
- `src/utils/maskUtils.js` — máscaras de CPF, telefone, CEP + validação de CPF
- `src/utils/viaCepService.js` — busca de endereço via ViaCEP
- `src/utils/anamneseUtils.js` — cálculo de status de anamnese, labels de enum

## Peer dependencies

Os projetos consumidores precisam ter instalado: `react`, `react-dom`, `@radix-ui/react-slot`,
`@radix-ui/react-label`, `@radix-ui/react-checkbox`, `@radix-ui/react-progress`,
`class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react` — já presentes no `posturare-crm`.

## Estilo (Tailwind)

Este pacote não inclui CSS — as classes usadas (`bg-primary`, `text-card-foreground`, etc.) dependem
de o projeto consumidor ter o Tailwind config com as variáveis de tema do shadcn/ui já definidas
(mesmo `tailwind.config.js` usado no `posturare-crm`). O `posturare-app` precisa copiar esse config.
