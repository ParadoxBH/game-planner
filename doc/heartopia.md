## Fórmula de Preço de Venda (Flores)

Foi identificado que as flores utilizam uma fórmula para calcular o preço de venda com base no nível.

### Multiplicadores por nível

multiplicador = [1, 1.5, 2, 2.5, 4]

### Fórmula

preco = ARREDONDAR.PARA.CIMA(multiplicador[item.level] * item.sellPriceBase / 5; 0) * 5

### Descrição

- valor_base: valor inicial da flor  
- nivel: índice do multiplicador correspondente  
- O resultado é sempre arredondado para cima para o múltiplo de 5 mais próximo