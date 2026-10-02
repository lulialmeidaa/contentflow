# PRD — ContentFlow
## Plataforma pessoal de organização e produção de conteúdo

**Versão:** 1.0  
**Status:** MVP  
**Idioma inicial:** Português (Brasil)  
**Plataformas:** Web responsivo + aplicativo mobile  
**Usuária principal:** Criadora de conteúdo / Social Media  
**Objetivo:** Transformar uma lista simples de ideias de conteúdo em uma rotina organizada de produção, levando em consideração calendário editorial, etapas de produção, compromissos pessoais e disponibilidade para gravação.

---

# 1. Visão do produto

O ContentFlow será uma plataforma pessoal para organizar todo o processo de criação de conteúdo, desde uma ideia bruta até o conteúdo finalizado/publicado.

A proposta é que a usuária **não precise montar manualmente seu calendário de gravações**.

Ela poderá simplesmente inserir as ideias do mês, por exemplo:

- "vídeo mostrando minha rotina de skincare" — Reels
- "produtos que comprei no mês" — Reels
- "mostrar minha ida ao mercado" — Stories
- "favoritos do mês" — Carrossel

O sistema deverá organizar essas ideias em um planejamento de produção e, considerando:

- datas de publicação;
- tempo disponível;
- compromissos pessoais;
- quantidade de conteúdos pendentes;
- preferência por concentrar gravações nos finais de semana;

deverá sugerir automaticamente **o que gravar em cada dia disponível**.

O sistema deve funcionar como uma espécie de **assistente visual de produção**, deixando claro diariamente:

> "O que eu preciso fazer hoje para manter meu conteúdo em dia?"

---

# 2. Problema

A criação de conteúdo envolve várias etapas e frequentemente gera dificuldade para:

- lembrar todas as ideias;
- decidir o que gravar em determinado dia;
- organizar gravações em lote;
- conciliar gravações com compromissos pessoais;
- acompanhar o estágio de cada conteúdo;
- evitar deixar conteúdos para a última hora;
- manter uma frequência constante de publicação;
- visualizar o trabalho necessário para a semana.

A plataforma deve reduzir essa carga de organização e transformar o planejamento em uma rotina simples e visual.

---

# 3. Objetivos

## Objetivos principais

1. Centralizar todas as ideias e conteúdos.
2. Permitir entrada rápida de ideias em formato de texto bruto.
3. Organizar automaticamente os conteúdos.
4. Criar uma agenda de produção baseada na disponibilidade.
5. Priorizar gravações nos finais de semana.
6. Agrupar conteúdos semelhantes para gravação em lote.
7. Permitir acompanhar cada conteúdo por etapas.
8. Integrar compromissos pessoais ao planejamento.
9. Mostrar claramente as tarefas do dia.
10. Permitir registrar roteiros, legendas, referências e arquivos.
11. Permitir acompanhar métricas após publicação.

## Não objetivos do MVP

Não será necessário inicialmente:

- integração direta com Instagram;
- publicação automática no Instagram;
- geração automática por IA;
- geração automática de roteiros por IA;
- geração automática de legendas por IA;
- análise automática de métricas do Instagram.

Essas funcionalidades podem ser consideradas em versões futuras.

---

# 4. Princípios de UX

A plataforma deve ser:

- muito intuitiva;
- visualmente limpa;
- rápida;
- simples de usar;
- com poucos campos obrigatórios;
- orientada à ação;
- mobile-first;
- sem excesso de informações na tela;
- com sensação de "lista pessoal organizada", e não de software corporativo.

## Regra principal

A usuária deve conseguir adicionar uma ideia de conteúdo em poucos segundos.

**Não exigir formulário complexo para cadastrar uma ideia.**

---

# 5. Identidade visual

## Paleta

### Preto
Uso:
- textos principais;
- navegação;
- elementos de destaque;
- botões principais.

### Branco
Uso:
- fundo principal;
- cards;
- áreas de leitura;
- sensação de espaço e organização.

### Rosé
Uso como cor de destaque:
- ações;
- indicadores;
- status;
- seleção;
- elementos importantes;
- detalhes visuais.

A interface deve evitar excesso de rosé.

## Estilo

- Minimalista
- Elegante
- Feminino sem ser infantil
- Moderno
- Premium
- Clean
- Tipografia legível
- Cantos levemente arredondados
- Cards simples
- Ícones minimalistas

---

# 6. Estrutura principal

A aplicação deverá possuir uma navegação simples.

## Menu principal

1. **Hoje**
2. **Calendário**
3. **Conteúdos**
4. **Ideias**
5. **Agenda**
6. **Métricas**

Opcional:
7. **Configurações**

No mobile, utilizar navegação inferior ou menu compacto.

---

# 7. Tela inicial — "Hoje"

Essa deverá ser a principal tela do sistema.

Ao abrir o sistema, a usuária deverá visualizar imediatamente o que precisa fazer.

## Exemplo

**Bom dia, Luane! 🌷**

**Hoje — 01 de outubro**

### 🎯 Sua meta de hoje
**Gravar 3 conteúdos**

### 🎬 Conteúdos de hoje

**1. Reels — Minha rotina de skincare**
Status: Roteiro

**2. Reels — Produtos que comprei**
Status: Gravar

**3. Stories — Minha rotina da manhã**
Status: Gravar

### ⏰ Tempo disponível
**2h30**

### 📌 Próxima publicação
**Amanhã — Reels**

### ⚠️ Atenção
**4 conteúdos ainda precisam ser gravados esta semana.**

---

# 8. Cadastro rápido de conteúdo

A entrada de conteúdo deverá ser extremamente simples.

## Campo principal

Um campo de texto:

> "Digite ou cole suas ideias de conteúdo..."

A usuária poderá colar várias ideias de uma vez.

Exemplo:

```text
Reels — Minha rotina de skincare
Reels — Produtos favoritos do mês
Stories — Compras no mercado
Carrossel — Produtos que acabaram
Reels — Arrume-se comigo
```

O sistema deverá interpretar cada linha como um conteúdo separado.

## Formato

A única informação inicialmente necessária será o formato.

Formatos sugeridos:

- Reels
- Stories
- Foto
- Carrossel
- Outro

Caso o formato não seja identificado, o sistema deverá solicitar confirmação.

---

# 9. Organização automática

Após inserir as ideias, o sistema deverá organizar os conteúdos automaticamente.

Cada conteúdo deverá receber:

- título;
- formato;
- mês;
- data de publicação, se informada;
- prioridade;
- status;
- data planejada de gravação;
- agrupamento de gravação;
- roteiro;
- legenda;
- referências;
- arquivos;
- métricas.

## Importante

O sistema NÃO deve exigir que a usuária preencha tudo no momento do cadastro.

As informações poderão ser completadas conforme o conteúdo avançar.

---

# 10. Status dos conteúdos

Fluxo padrão:

**Ideia → Planejado → Roteiro → Gravar → Editar → Legenda → Finalizado → Publicado**

## Ideia

Conteúdo ainda está apenas no banco de ideias.

## Planejado

Conteúdo foi selecionado para fazer parte do planejamento.

## Roteiro

Conteúdo está sendo preparado para gravação.

## Gravar

Conteúdo está pronto para ser gravado.

## Editar

Gravação concluída e aguardando edição.

## Legenda

Vídeo/editado pronto, aguardando legenda.

## Finalizado

Conteúdo está completamente pronto para publicação.

## Publicado

Conteúdo já foi publicado.

---

# 11. Alteração de status

A alteração de status deverá ser muito simples.

Exemplo:

**Reels — Minha rotina de skincare**

[ Roteiro ] → [ Gravar ] → [ Editar ] → [ Legenda ] → [ Finalizado ]

A usuária poderá clicar/tocar no próximo status.

Também deverá ser possível voltar uma etapa caso necessário.

---

# 12. Calendário

O calendário deverá ter pelo menos três visualizações.

## 12.1 Mensal

Mostrar:

- conteúdos previstos;
- gravações;
- compromissos pessoais;
- publicações;
- dias disponíveis.

## 12.2 Semanal

Visualização mais detalhada da rotina.

Exemplo:

### Segunda
09h — Academia  
14h — Trabalho  
Sem gravação

### Terça
10h–12h — Janela disponível

### Quarta
14h — Compromisso  
Sem gravação

### Quinta
10h–12h — Janela disponível

### Sexta
Dia livre / preparação

### Sábado
09h–13h — GRAVAÇÃO EM LOTE

### Domingo
Livre

---

# 13. Regra de disponibilidade

A usuária prefere manter **os finais de semana como principais períodos livres para gravação**.

O sistema deverá considerar essa preferência.

## Prioridade de planejamento

1. Sábado
2. Domingo, apenas se necessário
3. Horários livres durante a semana

O sistema NÃO deve assumir que todo final de semana precisa ser ocupado.

Deve respeitar a quantidade de conteúdos e o tempo necessário.

## Exemplo

Se existem 8 Reels para gravar e sábado possui 4 horas livres:

> **Sábado — Gravação em lote**
> 
> 4 conteúdos sugeridos

Os demais poderão ser distribuídos durante a semana caso necessário.

---

# 14. Compromissos pessoais

A usuária deverá poder adicionar compromissos pessoais.

Exemplo:

**01/10**
- 09:00 — Academia
- 14:00 — Médico
- 18:00 — Inglês

Cada compromisso deverá possuir:

- título;
- data;
- horário inicial;
- horário final;
- recorrência opcional;
- observação opcional.

---

# 15. Organização automática da agenda

O sistema deverá cruzar:

**Conteúdos pendentes + datas de publicação + tempo estimado + compromissos + preferência de gravação**

para sugerir horários de produção.

## Exemplo

Publicação:
**05/10 — Reels**

Conteúdo:
"Rotina de skincare"

Tempo estimado:
45 minutos

Agenda:
09h–10h compromisso

Disponibilidade:
10h–12h

Sistema:

> 🎥 **Gravar hoje**
> 
> Reels — Rotina de skincare
> 
> ⏰ 10h–10h45
> 
> Você possui 1h15 disponível depois dessa gravação.

---

# 16. Gravação em lote

Essa é uma funcionalidade prioritária.

O sistema deverá identificar conteúdos que podem ser gravados juntos.

Critérios possíveis:

- mesmo formato;
- mesmo cenário;
- mesma categoria/pilar;
- mesma necessidade de preparação;
- mesma data de gravação;
- mesma localização.

## Exemplo

### 🎬 GRAVAÇÃO EM LOTE
**Sábado — 04/10**

**Tempo disponível:** 4h

1. Reels — Rotina de skincare
2. Reels — Produtos favoritos
3. Reels — Testando produto novo
4. Reels — Minha rotina da noite

**Total estimado:** 3h20

**Reserva:** 40 min

---

# 17. Tempo estimado

Cada conteúdo poderá ter um tempo estimado.

Valores rápidos:

- 15 min
- 30 min
- 45 min
- 1h
- 1h30
- 2h
- Personalizado

O sistema poderá sugerir um tempo padrão baseado no formato.

Exemplo:

Reels:
**45 min**

Stories:
**15 min**

Carrossel:
**30 min**

A usuária poderá alterar.

---

# 18. Banco de ideias

Área para armazenar ideias ainda não planejadas.

Exemplo:

### 💡 Ideias

- Vídeo mostrando minha nécessaire
- Testar produto X
- Compras de skincare
- Rotina antes de dormir
- Favoritos do mês

Cada ideia poderá ser convertida em conteúdo planejado.

Botão:

**+ Transformar em conteúdo**

---

# 19. Página de conteúdo

Cada conteúdo deverá possuir uma página própria.

## Informações

### Título
Minha rotina de skincare

### Formato
Reels

### Status
Gravar

### Data de publicação
05/10

### Data de gravação
03/10

### Tempo estimado
45 min

### Roteiro

Campo de texto livre.

### Legenda

Campo de texto livre.

### Referências

Possibilidade de adicionar:

- texto;
- link;
- imagem;
- vídeo;
- arquivo.

### Arquivos

Upload de:

- fotos;
- vídeos;
- documentos;
- capas;
- referências.

---

# 20. Referências

Cada conteúdo poderá ter referências associadas.

Exemplos:

- link do Instagram;
- link do TikTok;
- imagem;
- vídeo;
- observação.

A referência deve ficar vinculada ao conteúdo.

---

# 21. Métricas

Após o conteúdo ser publicado, a usuária poderá registrar manualmente:

- visualizações;
- curtidas;
- comentários;
- compartilhamentos;
- salvamentos;
- alcance;
- seguidores ganhos;
- data de publicação.

## Objetivo

Permitir futuramente analisar quais formatos e temas apresentam melhor desempenho.

---

# 22. Dashboard de métricas

Tela simples com filtros:

- período;
- formato;
- tema/pilar;
- conteúdo.

Indicadores:

**Total de conteúdos publicados**

**Visualizações**

**Curtidas**

**Comentários**

**Compartilhamentos**

**Salvamentos**

**Alcance**

**Seguidores ganhos**

Também poderá mostrar gráficos simples de evolução.

---

# 23. Notificações

No MVP, notificações básicas podem ser implementadas.

Exemplos:

> 🎬 Você tem 3 conteúdos para gravar hoje.

> ⚠️ Seu conteúdo de amanhã ainda não foi finalizado.

> 📅 Você possui uma janela de gravação disponível amanhã.

> ✅ Você finalizou todos os conteúdos planejados para esta semana!

As notificações devem ser úteis, sem excesso.

---

# 24. Regras de planejamento automático

O algoritmo de planejamento deverá considerar:

### Entrada

- conteúdos pendentes;
- formato;
- data de publicação;
- tempo estimado;
- status;
- compromissos;
- horários disponíveis;
- preferência de gravação;
- quantidade de conteúdos necessários.

### Prioridade

1. Conteúdos com publicação mais próxima.
2. Conteúdos atrasados.
3. Conteúdos ainda não gravados.
4. Conteúdos que podem ser agrupados.
5. Preferência por finais de semana.
6. Disponibilidade real da agenda.

### Resultado

Gerar automaticamente:

- dia de gravação;
- horário sugerido;
- conteúdos agrupados;
- quantidade de conteúdos;
- tempo estimado;
- alerta de possíveis atrasos.

---

# 25. Exemplo completo de funcionamento

A usuária adiciona:

```text
Reels — Minha rotina de skincare
Reels — Produtos que comprei
Reels — Favoritos do mês
Stories — Minha rotina da manhã
Carrossel — Produtos que acabaram
Reels — Arrume-se comigo
```

Depois adiciona seus compromissos:

**Segunda**
09h — Academia  
14h — Trabalho

**Terça**
10h — Médico

**Quarta**
18h — Inglês

**Quinta**
Sem compromissos

**Sexta**
Sem compromissos

**Sábado**
Livre

O sistema identifica:

- sábado como principal janela para gravação em lote;
- quinta e sexta como alternativas;
- conteúdos com publicação mais próxima como prioritários.

Resultado:

### Sábado
🎬 Gravação em lote — 4 conteúdos

### Quinta
🎬 Gravar — 1 conteúdo

### Sexta
🎬 Gravar — 1 conteúdo

### Segunda
📋 Apenas edição/legenda, caso necessário.

---

# 26. Sistema de prioridades

Cada conteúdo poderá possuir:

- 🔴 Alta
- 🟡 Média
- ⚪ Baixa

Por padrão, a prioridade poderá ser definida automaticamente pela proximidade da publicação.

A usuária poderá alterar manualmente.

---

# 27. Busca e filtros

A área de conteúdos deverá permitir pesquisar e filtrar por:

- título;
- formato;
- status;
- período;
- prioridade;
- publicado/não publicado.

---

# 28. Experiência mobile

Como a criação de conteúdo acontece frequentemente pelo celular, a experiência mobile é essencial.

Deve ser possível pelo celular:

- adicionar ideias;
- visualizar o dia;
- mudar status;
- escrever roteiro;
- escrever legenda;
- adicionar referências;
- anexar arquivos;
- consultar agenda;
- marcar conteúdo como finalizado;
- adicionar métricas.

---

# 29. Experiência desktop

No desktop, priorizar:

- calendário;
- planejamento mensal;
- organização de conteúdos;
- edição de roteiros;
- visualização de produção;
- métricas.

---

# 30. Modelo de dados inicial

## User

- id
- name
- email
- profile_photo
- timezone
- created_at

## Content

- id
- title
- format
- status
- priority
- idea
- script
- caption
- publication_date
- recording_date
- estimated_duration
- category
- notes
- created_at
- updated_at
- published_at

## ContentReference

- id
- content_id
- type
- url
- file
- note

## ContentAsset

- id
- content_id
- file_url
- file_type
- file_name

## PersonalEvent

- id
- title
- start_datetime
- end_datetime
- recurrence
- notes

## RecordingSession

- id
- date
- start_time
- end_time
- estimated_duration
- notes

## RecordingSessionContent

- recording_session_id
- content_id
- order

## Metrics

- id
- content_id
- views
- likes
- comments
- shares
- saves
- reach
- followers_gained
- recorded_at

## Idea

- id
- title
- format
- notes
- created_at

---

# 31. MVP

## Obrigatório

### Conteúdo
- cadastro rápido;
- entrada de ideias em massa;
- formatos;
- status;
- prioridades;
- datas;
- roteiros;
- legendas;
- referências;
- anexos.

### Agenda
- calendário;
- compromissos pessoais;
- horários disponíveis;
- preferência por finais de semana.

### Planejamento
- sugestão automática do que gravar;
- gravação em lote;
- tempo estimado;
- priorização por data.

### Dashboard
- "Hoje";
- tarefas do dia;
- próxima publicação;
- conteúdos pendentes;
- alertas.

### Ideias
- banco de ideias;
- transformação de ideia em conteúdo.

### Métricas
- cadastro manual;
- dashboard básico.

---

# 32. V2

Após validar o MVP:

- integração com Instagram;
- importação automática de métricas;
- IA para criação de roteiros;
- IA para legendas;
- IA para sugestões de conteúdo;
- análise automática de desempenho;
- recomendações baseadas no histórico;
- calendário editorial inteligente;
- templates de conteúdo;
- colaboração com outras pessoas;
- gerenciamento de clientes/projetos.

---

# 33. V3 — Assistente inteligente

Possível evolução para um verdadeiro assistente de conteúdo.

Exemplo:

> "Tenho 2 horas livres sábado. O que devo gravar?"

Sistema responde:

> Você tem 5 conteúdos pendentes.
>
> Recomendo gravar:
> 1. Rotina de skincare — 45 min
> 2. Produtos favoritos — 40 min
> 3. Compras do mês — 35 min
>
> Total: 2h.
>
> Esses conteúdos cobrem suas próximas publicações e podem ser gravados no mesmo cenário.

---

# 34. Critérios de sucesso

O MVP será considerado bem-sucedido se a usuária conseguir:

1. Inserir todas as ideias do mês rapidamente.
2. Visualizar automaticamente o que precisa produzir.
3. Saber o que gravar em cada dia.
4. Organizar uma gravação em lote sem planejamento manual complexo.
5. Conciliar compromissos pessoais e produção.
6. Acompanhar o status de cada conteúdo.
7. Encontrar facilmente roteiros, legendas e referências.
8. Visualizar o calendário completo.
9. Registrar resultados dos conteúdos publicados.

---

# 35. Requisito central do produto

> **A plataforma não deve apenas armazenar conteúdos. Ela deve transformar conteúdos planejados em uma rotina de produção executável.**

A pergunta que a plataforma precisa responder diariamente é:

> **"O que eu preciso fazer hoje para manter meu conteúdo em dia?"**

E a resposta deverá considerar automaticamente:

**O que precisa ser publicado → o que precisa ser produzido → quando a usuária está disponível → quais conteúdos podem ser gravados juntos.**

---

# 36. Diretriz final de UX

A usuária não deve precisar "gerenciar o sistema".

O sistema deve fazer o máximo possível da organização automaticamente.

A experiência ideal é:

**1. Jogar as ideias no sistema.**  
↓  
**2. Adicionar compromissos pessoais.**  
↓  
**3. O sistema organiza o calendário.**  
↓  
**4. A usuária abre "Hoje".**  
↓  
**5. Vê exatamente o que precisa fazer.**  
↓  
**6. Executa.**  
↓  
**7. Atualiza o status.**  
↓  
**8. Finaliza e publica.**  
↓  
**9. Registra os resultados.**

---

# 37. Resumo do produto

**ContentFlow** é uma plataforma pessoal de planejamento e execução de conteúdo que transforma ideias em uma rotina organizada de produção.

Seu principal diferencial não é ser apenas um calendário ou banco de conteúdos.

É a capacidade de conectar:

**Conteúdo + Agenda pessoal + Disponibilidade + Gravação em lote + Status de produção**

em uma única rotina automática e visual.

A plataforma deve fazer a organização pesada e deixar para a usuária apenas a execução.
