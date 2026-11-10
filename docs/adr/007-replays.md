# ADR 007: Replays a partir de seed + ações

**Status:** aceito

## Contexto

O engine é determinístico: a mesma seed, os mesmos decks e as mesmas ações produzem exatamente a
mesma partida. O servidor já guardava isso para conferir o resultado de cada partida registrada.

## Decisões

- **Replay = reproduzir, não gravar vídeo nem estados.** O arquivo de replay tem só seed, decks e
  ações (mais rótulos: lado e nomes). O front reconstrói todos os estados com o engine
  (`buildTimeline`) e guarda todos na memória: o Immer compartilha as partes iguais, então uma
  partida inteira é barata e pular para qualquer jogada é instantâneo (sem "quadros-chave").
- **O mesmo tabuleiro.** O `Board` ganhou o modo `replay` (somente leitura: sem janelas de troca e
  escolha, sem tela final e sem atalhos da partida). As animações de carta funcionam de graça,
  porque cada jogada é só um novo estado.
- **Três origens, um formato.** `/replay/<id>` busca a partida no servidor; `/replay/local` recebe o
  arquivo no estado da navegação (tela final contra o computador, que não precisa de servidor, ou
  um arquivo exportado e aberto no Histórico). Todos viram o mesmo `ReplayFile` (schema Zod em
  `@gwent/shared`, com versão).
- **Partidas online no histórico.** Ao entrar numa sala, o cliente pode mandar o id do perfil. No fim
  da partida, as salas chamam a interface `MatchRecorder` (implementada pelo `MatchesService`), que
  reproduz a partida uma vez e grava uma linha para cada jogador com perfil, com `side`, `mode` e o
  nome do oponente. Uma falha ao gravar nunca afeta a sala.
- **Sugestão do bot.** Para cada jogada, o replay mostra o que o bot por regras faria no mesmo
  estado (determinístico por jogada), para comparar com o que foi feito.

## Consequências

- Mudar uma regra do engine pode mudar replays antigos (a mesma ação passa a ter outro efeito). Se
  isso virar problema, o arquivo já tem `version` para separar formatos ou versões de regras.
- O replay mostra as duas mãos (basta trocar o lado): só é aberto depois que a partida acabou.
