# 🌊 Agulhas Protege — App Mobile (Android / iOS)

Versão **mobile nativa** do sistema [Agulhas Protege](https://github.com/Pedroantps/projeto-agulhas-protege) de monitoramento e alerta de cheias do Rio Sesmaria (Resende-RJ).

O app foi feito com **React Native + Expo (SDK 58)**, **Expo Router** e **NativeWind** (Tailwind CSS). Ele é gerado como um **APK instalável**, não é o site aberto no navegador do celular.

---

## 1. Como o app se conecta ao sistema principal

```
┌──────────────────────┐        ┌──────────────────────────────┐
│  Site web (React)    │        │  App mobile (este repo)      │
│  Painel Defesa Civil │        │  Cidadão + operador de campo │
└──────────┬───────────┘        └───┬──────────────┬───────────┘
           │   /api/v1/*            │ /api/v1/*    │ dados públicos, em tempo real
           └──────────┬─────────────┘              │
              ┌───────▼────────┐          ┌────────▼──────────────────┐
              │ API FastAPI    │          │ CEMADEN – estação Rio     │
              │ (backend/)     │          │ Sesmarias (nível, chuva,  │
              └───────┬────────┘          │ câmera) · Open-Meteo      │
              ┌───────▼────────┐          │ (chuva prevista)          │
              │ PostgreSQL 16  │          └───────────────────────────┘
              └────────────────┘
```

### Dados reais e em tempo real

O nível exibido no app é **medido de verdade**, não simulado:

| Dado | Fonte | Atualização |
|---|---|---|
| Nível do Rio Sesmaria + histórico de até 4 dias | [CEMADEN](https://mapainterativo.cemaden.gov.br/), estação hidrológica **Rio Sesmarias** (cód. `330420118H`, Resende-RJ), sensor radar na ponte | a cada 10 min a 1 h |
| Chuva na última hora e em 24h | Pluviômetro da mesma estação do CEMADEN | a cada 10 min |
| Foto do rio | Câmera da estação do CEMADEN | 1 foto por hora |
| Chuva prevista (3 dias) para Resende e para a cabeceira em São José do Barreiro-SP | [Open-Meteo](https://open-meteo.com/) | a cada hora |

O app consulta essas fontes a cada 5 minutos com o app aberto, e o monitor em segundo plano consulta a cada 15 minutos para disparar notificações.

### O que vem do sistema principal (mesma API e mesmo banco do site)

- **Estação e cotas de risco** (Atenção / Alerta / Emergência). O administrador altera as cotas no painel web (`/admin`) e o app passa a classificar o nível real com os novos valores, usando a mesma regra de `classificacao_risco.py` do backend.
- **Ocorrências de campo.** Uma ocorrência registrada no celular aparece na hora no Dashboard da Defesa Civil do site, e vice-versa.
- **Login** com as mesmas credenciais e a mesma autenticação do site: JWT em cookies httpOnly, com *refresh token rotation*.

| Endpoint da API                          | Uso no app                                 |
|------------------------------------------|--------------------------------------------|
| `GET  /estacoes/status-atual`            | Estação e cotas de risco                   |
| `GET  /ocorrencias`                      | Lista de ocorrências e badge da aba        |
| `POST /ocorrencias`                      | Registro em campo com GPS                  |
| `PATCH /ocorrencias/{id}/status`         | Iniciar / encerrar atendimento             |
| `POST /auth/login`, `/refresh`, `/logout`| Sessão do operador                         |

Se a API do projeto estiver fora do ar, o app continua mostrando o nível real com as cotas padrão e avisa isso na tela.

### Previsão

A aba Previsão estima o nível em +24h, +48h e +72h **com dados reais de entrada**: o nível atual e a tendência medidos pelo CEMADEN, a chuva medida pelo pluviômetro e a chuva prevista pelo Open-Meteo para a cabeceira e para Resende. O modelo (`src/lib/previsao.ts`) é um tanque linear simplificado:
- a chuva da cabeceira pesa 60% e a de Resende 40%;
- o escoamento aumenta com a saturação do solo das últimas 48h;
- o rio recua 20% por dia sem chuva;
- a subida em curso é propagada para o dia seguinte.

É uma estimativa didática e não substitui os comunicados oficiais.

## 2. Escopo: o que faz sentido no celular

O app **não é uma cópia 1:1** do site. O painel administrativo (edição de cotas) e as tabelas de correlação estatística ficaram só na web, porque são tarefas de escritório. No celular, o foco está em **quem está na rua**:

| Funcionalidade | Por que no mobile |
|---|---|
| 🔔 **Notificação de mudança de risco em segundo plano** (`expo-background-task` + `expo-notifications`) | O site só avisa quem está com ele aberto. O celular avisa o morador mesmo com o app fechado. |
| 📍 **Registro de ocorrência com GPS** (`expo-location` + geocodificação reversa) | O operador da Defesa Civil está no local alagado. O endereço é preenchido sozinho. |
| 📞 **Ligar para 199 / 193** com um toque | Em emergência, a pessoa liga direto do app. |
| 💬 **Boletim no WhatsApp** e 📤 **compartilhar o nível** (Share nativo) | É o canal que a população realmente usa. |
| 🗺️ **Abrir ocorrência no mapa** | Navegação até o local do atendimento. |
| 📷 **Foto do rio** a cada hora (câmera do CEMADEN) | O morador vê com os próprios olhos como o rio está, sem ir até a margem. |
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
