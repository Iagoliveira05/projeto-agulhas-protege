# 🌊 Agulhas Protege — App Mobile (Android / iOS)

Versão **mobile nativa** do sistema [Agulhas Protege](https://github.com/Pedroantps/projeto-agulhas-protege) de monitoramento e alerta de cheias do Rio Sesmaria (Resende-RJ).

O app foi feito com **React Native + Expo (SDK 58)**, **Expo Router** e **NativeWind** (Tailwind CSS). Ele é gerado como um **APK instalável**, não é o site aberto no navegador do celular.

---

## 1. Como o app se conecta ao sistema principal

```
┌──────────────────────┐        ┌──────────────────────────┐
│  Site web (React)    │        │  App mobile (este repo)  │
│  Painel Defesa Civil │        │  Cidadão + operador campo│
└──────────┬───────────┘        └────────────┬─────────────┘
           │   HTTP/JSON  /api/v1/*          │
           └───────────────┬─────────────────┘
                   ┌───────▼────────┐
                   │ API FastAPI    │  ← mesma API, sem alteração
                   │ (backend/)     │
                   └───────┬────────┘
                   ┌───────▼────────┐
                   │ PostgreSQL 16  │  ← mesmo banco de dados
                   └────────────────┘
```

- O app **usa a mesma API e o mesmo banco** do projeto web. Nenhum dado é mockado: uma ocorrência registrada no celular aparece na hora no Dashboard da Defesa Civil do site, e vice-versa.
- O **login usa as mesmas credenciais e a mesma autenticação** do site: JWT em cookies httpOnly, com *refresh token rotation*. O cookie jar nativo do Android/iOS guarda os cookies.
- O contrato de dados (`src/lib/api.ts`) espelha o `frontend/src/services/api.ts` do site. As chaves de cache do React Query e a paleta de cores (`tailwind.config.js`) também foram reaproveitadas.

| Endpoint da API                          | Uso no app                                 |
|------------------------------------------|--------------------------------------------|
| `GET  /estacoes/status-atual`            | Aba **Nível** + monitor em segundo plano   |
| `GET  /leituras/historico`               | Gráfico 24h / 72h / 7 dias                 |
| `GET  /sesmaria/dashboard-ia`            | Aba **Previsão** (IA +24h/+48h/+72h)       |
| `GET  /ocorrencias`                      | Lista de ocorrências e badge da aba        |
| `POST /ocorrencias`                      | Registro em campo com GPS                  |
| `PATCH /ocorrencias/{id}/status`         | Iniciar / encerrar atendimento             |
| `POST /auth/login`, `/refresh`, `/logout`| Sessão do operador                         |

## 2. Escopo: o que faz sentido no celular

O app **não é uma cópia 1:1** do site. O painel administrativo (edição de cotas) e as tabelas de correlação estatística ficaram só na web, porque são tarefas de escritório. No celular, o foco está em **quem está na rua**:

| Funcionalidade | Por que no mobile |
|---|---|
| 🔔 **Notificação de mudança de risco em segundo plano** (`expo-background-task` + `expo-notifications`) | O site só avisa quem está com ele aberto. O celular avisa o morador mesmo com o app fechado. |
| 📍 **Registro de ocorrência com GPS** (`expo-location` + geocodificação reversa) | O operador da Defesa Civil está no local alagado. O endereço é preenchido sozinho. |
| 📞 **Ligar para 199 / 193** com um toque | Em emergência, a pessoa liga direto do app. |
| 💬 **Boletim no WhatsApp** e 📤 **compartilhar o nível** (Share nativo) | É o canal que a população realmente usa. |
| 🗺️ **Abrir ocorrência no mapa** | Navegação até o local do atendimento. |
| 👆 Gráfico com **gesto de arrastar** para inspecionar leituras, **puxar para atualizar**, **feedback háptico** | Padrões de interação de toque. |

## 3. Navegação e UI

- **Abas inferiores nativas** (`expo-router/native-tabs`): Material 3 no Android e tab bar nativa no iOS. São quatro abas: Nível · Previsão · Ocorrências · Conta. A aba Ocorrências mostra um badge com o número de ocorrências abertas.
- **Pilha nativa** dentro da aba Ocorrências: lista → detalhes, e "Nova ocorrência" abre como **modal**.
- Botões com altura mínima de 48dp, *pull-to-refresh*, botão de ação fixo, teclado que não cobre os campos e modo escuro automático.
- Os textos de orientação de segurança mudam conforme o nível de risco: Normal, Atenção, Alerta ou Emergência.

## 4. Estrutura

```
src/
  app/                    # rotas (Expo Router)
    _layout.tsx           # providers + abas nativas
    index.tsx             # Nível (portal do cidadão)
    previsao.tsx          # Previsão IA do Rio Sesmaria
    conta.tsx             # Login, alertas, servidor da API
    ocorrencias/          # Stack: lista, [id], nova (modal)
  components/             # UI (NativeWind) e gráfico SVG
  hooks/queries.ts        # React Query (mesmas chaves do site)
  lib/
    api.ts                # cliente da API FastAPI
    auth.tsx              # sessão do operador
    alert-monitor.ts      # tarefa em segundo plano + notificações
    config.ts             # URL da API (configurável no app)
    risk.ts               # classificação de risco, cores, orientações
```

## 5. Como rodar

### 5.1 Subir o backend do projeto web

No repositório web, suba a API normalmente (`docker compose up --build -d` e depois o seed). Para o celular conseguir usar os cookies de login por **HTTP na rede local**, a API precisa rodar com `COOKIE_SECURE=false`. Os navegadores só aceitam cookies `Secure` sem HTTPS quando o endereço é `localhost`; o celular acessa pelo IP da rede, então não aceita.

No `docker-compose.yml` do projeto web, acrescente no serviço `backend → environment`:

```yaml
COOKIE_SECURE: "false"
```

Se a API for publicada com **HTTPS**, nada disso é necessário.

**Windows sem Docker:** existe um ambiente local já configurado em `C:\repos\React\agulhas-protege-web`. Ele usa um PostgreSQL 16 embutido (pacote `pgserver`), um `.env` com `COOKIE_SECURE=false` e um launcher compatível com o event loop do Windows. Para subir tudo:

```powershell
cd C:\repos\React\agulhas-protege-web
.\iniciar-backend.ps1
```

Deixe essa janela aberta enquanto usa o app.

### 5.2 Rodar o app

```bash
npm install
cp .env.example .env    # ajuste EXPO_PUBLIC_API_URL
npx expo start
```

- Emulador Android: `http://10.0.2.2:8000`
- Celular físico: `http://<IP-do-PC-na-rede>:8000`, com o celular e o PC na mesma rede Wi-Fi
- O endereço também pode ser trocado em tempo de execução na aba **Conta → Servidor da API**, que tem um botão para testar a conexão via `/health`.

Credenciais do seed do backend:

| Perfil | E-mail | Senha |
|---|---|---|
| Operador | `operador@defesacivil.resende.rj.gov.br` | `Operador@2026` |
| Admin | `admin@defesacivil.resende.rj.gov.br` | `Admin@2026` |

### 5.3 Gerar o APK (entrega)

```bash
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview
```

Ao final, o EAS mostra um link/QR code para baixar o `.apk` e instalar no celular. Para gerar localmente, com Android Studio instalado, use `npx expo run:android --variant release`.

## 6. Qualidade

```bash
npx tsc --noEmit   # typecheck
npx expo lint      # lint
npx expo-doctor    # dependências/config
```
