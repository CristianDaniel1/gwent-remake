# ADR 008: Níveis de dificuldade do bot

**Status:** aceito

## Contexto

O bot por regras (pesos para cada tipo de jogada) é o nível "normal". Faltavam um nível mais
fácil, para quem está aprendendo, e um mais forte, sem custo e sem servidor.

## Decisões

- **Fácil:** o bot normal, mas em 35% dos turnos joga uma carta aleatória no lugar da planejada.
- **Normal:** o bot por regras, sem mudanças.
- **Difícil: Monte Carlo com determinização** (`searchAiAction`). Para cada jogada possível, sorteia
  mundos compatíveis com o que o bot pode ver (a mão do oponente é tirada de novo de mão + baralho
  dele, os baralhos são embaralhados e o gerador aleatório recebe outra seed), aplica a jogada e
  simula o resto da partida com o bot normal nos dois lados. Fica a jogada com a melhor média
  (vitória/derrota, com um pequeno bônus pela margem de pontos). Os mesmos mundos são usados para
  todas as jogadas, para compará-las com justiça. Troca inicial e escolhas continuam com as regras.
- **Simular até o fim da partida, não da rodada.** A primeira versão avaliava o fim da rodada atual
  e perdia para o normal (4 vitórias em 40): gastava cartas para ganhar a rodada. Simulando até o
  fim, venceu 23 de 40. O fácil venceu 82 de 200 contra o normal.
- **Web Worker no front.** O difícil pensa até 1,2 s por jogada num worker (`features/game/bot`),
  sem travar as animações. Sem worker (testes), faz uma busca curta na thread principal.
- A dificuldade fica nas configurações (montador de baralho) e é fixada no início de cada partida.

## Consequências

- O difícil "sabe" quais cartas existem no baralho do oponente (não quais estão na mão): é uma
  aproximação razoável e não usa informação escondida da partida atual.
- Dá para deixá-lo mais forte aumentando o tempo de busca ou trocando a busca plana por ISMCTS.
