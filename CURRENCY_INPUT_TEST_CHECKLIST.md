# ✅ Checklist de Testes Manuais - CurrencyInput

## 📋 Pré-requisitos
- [ ] Aplicação rodando em modo de desenvolvimento
- [ ] DevTools aberto na aba Network para capturar payloads
- [ ] Acesso a um projeto TAP existente ou criar um novo

---

## 🧪 Testes do Componente CurrencyInput

### 1. Teste de Campo Vazio
- [ ] **1.1** Abrir formulário TAPForm ou editar um projeto em TAPDetails
- [ ] **1.2** Limpar completamente um campo de moeda (ex: "Valor do Projeto")
- [ ] **1.3** Clicar fora do campo (blur)
- [ ] **1.4** ✅ **ESPERADO**: Campo permanece vazio, não mostra "R$ 0,00"
- [ ] **1.5** Salvar formulário e verificar payload na aba Network
- [ ] **1.6** ✅ **ESPERADO**: Campo enviado como `null`, não como `0`

### 2. Teste de Entradas Parciais
- [ ] **2.1** Clicar em um campo de moeda vazio
- [ ] **2.2** Digitar apenas "12" (sem vírgula ou pontos)
- [ ] **2.3** ✅ **ESPERADO**: Campo aceita a entrada parcial "12"
- [ ] **2.4** Adicionar vírgula: "12,"
- [ ] **2.5** ✅ **ESPERADO**: Campo aceita "12,"
- [ ] **2.6** Adicionar decimais: "12,50"
- [ ] **2.7** ✅ **ESPERADO**: Campo aceita "12,50"
- [ ] **2.8** Clicar fora do campo (blur)
- [ ] **2.9** ✅ **ESPERADO**: Campo formata para "R$ 12,50"

### 3. Teste de Formatação no Blur
- [ ] **3.1** Clicar em campo vazio
- [ ] **3.2** Digitar "1234567"
- [ ] **3.3** ✅ **ESPERADO**: Durante digitação, exibe "1234567" sem formatação
- [ ] **3.4** Clicar fora do campo (blur)
- [ ] **3.5** ✅ **ESPERADO**: Formata para "R$ 1.234.567,00"
- [ ] **3.6** Clicar novamente no campo (focus)
- [ ] **3.7** ✅ **ESPERADO**: Remove formatação, exibe "1234567" para facilitar edição

### 4. Teste de Limite Máximo
- [ ] **4.1** Clicar em campo vazio
- [ ] **4.2** Digitar "999999999" (nove 9's)
- [ ] **4.3** Clicar fora do campo
- [ ] **4.4** ✅ **ESPERADO**: Campo aceita e formata para "R$ 999.999.999,00"
- [ ] **4.5** Editar campo e digitar "999999999,99"
- [ ] **4.6** Clicar fora do campo
- [ ] **4.7** ✅ **ESPERADO**: Campo aceita e formata para "R$ 999.999.999,99"
- [ ] **4.8** Tentar digitar "1000000000" (1 bilhão)
- [ ] **4.9** ✅ **ESPERADO**: Campo rejeita valores acima de 999.999.999,99

### 5. Teste com Valores Decimais
- [ ] **5.1** Digitar "100,5"
- [ ] **5.2** ✅ **ESPERADO**: Durante digitação, exibe "100,5"
- [ ] **5.3** Blur no campo
- [ ] **5.4** ✅ **ESPERADO**: Formata para "R$ 100,50"
- [ ] **5.5** Digitar "50,123"
- [ ] **5.6** Blur no campo
- [ ] **5.7** ✅ **ESPERADO**: Formata para "R$ 50,12" (máximo 2 casas decimais)

### 6. Teste de Edição de Valor Existente
- [ ] **6.1** Carregar projeto com valores preenchidos
- [ ] **6.2** Clicar em campo com valor (ex: "R$ 10.000,00")
- [ ] **6.3** ✅ **ESPERADO**: Remove formatação, exibe "10000" para facilitar edição
- [ ] **6.4** Editar para "15000"
- [ ] **6.5** Blur no campo
- [ ] **6.6** ✅ **ESPERADO**: Formata para "R$ 15.000,00"

---

## 📤 Testes de Submissão - TAPForm

### 7. Criação de TAP com Campos Vazios
- [ ] **7.1** Abrir TAPForm para criar nova TAP
- [ ] **7.2** Preencher apenas campos obrigatórios (Nome, Cliente, etc.)
- [ ] **7.3** Deixar TODOS os campos de moeda vazios
- [ ] **7.4** Abrir DevTools > Network > filtrar por "fetch" ou "XHR"
- [ ] **7.5** Submeter formulário
- [ ] **7.6** ✅ **ESPERADO**: Request enviado com sucesso
- [ ] **7.7** Clicar no request na aba Network > Preview/Payload
- [ ] **7.8** ✅ **ESPERADO**: Campos vazios enviados como `null`, exemplo:
  ```json
  {
    "valor_projeto": null,
    "mrr": null,
    "receita_atual": null,
    // ... outros campos null
  }
  ```

### 8. Criação de TAP com Campos Preenchidos
- [ ] **8.1** Preencher campos obrigatórios
- [ ] **8.2** Preencher "Valor do Projeto" com "50000"
- [ ] **8.3** Preencher "MRR" com "2500,50"
- [ ] **8.4** Deixar outros campos de moeda vazios
- [ ] **8.5** Submeter formulário
- [ ] **8.6** Verificar payload na aba Network
- [ ] **8.7** ✅ **ESPERADO**: Payload contém:
  ```json
  {
    "valor_projeto": 50000,
    "mrr": 2500.50,
    "receita_atual": null,
    "investimento_comercial": null,
    // ... outros vazios como null
  }
  ```

### 9. Criação de TAP com Valores Mistos
- [ ] **9.1** Preencher alguns campos com valores
- [ ] **9.2** Deixar outros vazios
- [ ] **9.3** Preencher um campo e depois limpá-lo
- [ ] **9.4** Submeter formulário
- [ ] **9.5** ✅ **ESPERADO**: Valores preenchidos são números, vazios são `null`

---

## 🔄 Testes de Edição - TAPDetails

### 10. Edição: Campo com Valor → Vazio
- [ ] **10.1** Abrir TAPDetails de projeto existente com valores
- [ ] **10.2** Clicar em "Editar"
- [ ] **10.3** Clicar em campo "Valor do Projeto" (ex: "R$ 10.000,00")
- [ ] **10.4** Selecionar todo o texto (Ctrl+A) e deletar
- [ ] **10.5** Blur no campo
- [ ] **10.6** ✅ **ESPERADO**: Campo fica vazio
- [ ] **10.7** Clicar em "Salvar"
- [ ] **10.8** Verificar payload na aba Network
- [ ] **10.9** ✅ **ESPERADO**: Campo enviado como `null`

### 11. Edição: Campo Vazio → Com Valor
- [ ] **11.1** Abrir TAPDetails com campos vazios (null)
- [ ] **11.2** Clicar em "Editar"
- [ ] **11.3** Preencher campo vazio com "25000"
- [ ] **11.4** Blur e salvar
- [ ] **11.5** ✅ **ESPERADO**: Payload enviado com `25000` (número)

### 12. Edição: Modificar Valor Existente
- [ ] **12.1** Abrir TAPDetails com valores
- [ ] **12.2** Editar "MRR" de "R$ 5.000,00" para "7500"
- [ ] **12.3** Salvar
- [ ] **12.4** ✅ **ESPERADO**: Payload enviado com `7500`

### 13. Edição: Limite Máximo
- [ ] **13.1** Tentar editar campo para "1000000000" (1 bilhão)
- [ ] **13.2** ✅ **ESPERADO**: Campo rejeita entrada acima de 999.999.999,99
- [ ] **13.3** Editar para "999999999,99"
- [ ] **13.4** ✅ **ESPERADO**: Aceita e salva corretamente

---

## 🔍 Captura de Payloads de Rede

### Instruções para Captura
1. **Abrir DevTools**: F12 ou Ctrl+Shift+I
2. **Aba Network**: Clicar em "Network"
3. **Limpar histórico**: Clicar no ícone 🚫 para limpar
4. **Filtrar requests**: Digite "tap" ou "project" no filtro
5. **Executar ação**: Criar/editar TAP
6. **Capturar payload**:
   - Clicar no request relevante (geralmente POST ou PUT)
   - Clicar na aba "Payload" ou "Request Payload"
   - Copiar JSON completo

### 14. Captura: Criação com Campos Vazios
- [ ] **14.1** Executar teste #7
- [ ] **14.2** Capturar payload
- [ ] **14.3** ✅ **ESPERADO**: Screenshot ou JSON mostrando `null` para campos vazios

### 15. Captura: Edição Vazio → Valor
- [ ] **15.1** Executar teste #11
- [ ] **15.2** Capturar payload
- [ ] **15.3** ✅ **ESPERADO**: JSON mostrando número (não string)

### 16. Captura: Edição Valor → Vazio
- [ ] **16.1** Executar teste #10
- [ ] **16.2** Capturar payload
- [ ] **16.3** ✅ **ESPERADO**: JSON mostrando `null` (não 0)

---

## 🐛 Testes de Regressão

### 17. Compatibilidade com Valores Iniciais
- [ ] **17.1** Abrir projeto criado ANTES das alterações
- [ ] **17.2** ✅ **ESPERADO**: Valores exibem corretamente formatados
- [ ] **17.3** Editar e salvar
- [ ] **17.4** ✅ **ESPERADO**: Sem erros ou perda de dados

### 18. Teste de Navegação
- [ ] **18.1** Preencher campos em TAPForm
- [ ] **18.2** Navegar para outra aba SEM salvar
- [ ] **18.3** Voltar para a aba do formulário
- [ ] **18.4** ✅ **ESPERADO**: Valores digitados ainda presentes (não perdidos)

### 19. Teste de Múltiplos Campos
- [ ] **19.1** Preencher TODOS os campos de moeda com valores diferentes
- [ ] **19.2** Incluir casos: vazio, parcial, completo, máximo
- [ ] **19.3** Salvar
- [ ] **19.4** ✅ **ESPERADO**: Todos salvos corretamente conforme tipo

---

## 📊 Checklist de Validação Final

### Comportamento do Componente
- [ ] Campo aceita valores vazios
- [ ] Campo aceita entradas parciais durante digitação
- [ ] Campo formata APENAS no blur
- [ ] Campo valida limite de R$ 999.999.999,99
- [ ] Campo exibe valor sem formatação no focus

### Integração TAPForm
- [ ] Valores vazios enviados como `null`
- [ ] Valores preenchidos enviados como números
- [ ] Formulário não transforma "" em 0

### Integração TAPDetails
- [ ] Edição preserva comportamento de null
- [ ] Edição aceita mudanças vazio ↔ valor
- [ ] Payload correto em todas as operações

### Payloads de Rede
- [ ] Capturas confirmam valores null para campos vazios
- [ ] Capturas confirmam números (não strings) para valores preenchidos
- [ ] Nenhum 0 indesejado em campos que deveriam ser null

---

## 📝 Notas Importantes

⚠️ **BRANCH CRIADA**: Não é possível criar branches Git via Lovable  
⚠️ **PR NÃO ABERTO**: Não é possível abrir PRs via Lovable  
⚠️ **TESTES AUTOMATIZADOS**: Arquivos de teste criados, mas não executados  

**Instruções de Merge Manual:**
1. Revisar todos os testes acima
2. Validar capturas de payload
3. Confirmar que funcionalidade existente não foi quebrada
4. Criar branch manualmente: `git checkout -b fix/currencyinput-empty-and-max`
5. Commitar alterações
6. Abrir PR manualmente no GitHub/GitLab
7. Solicitar code review
8. Aguardar aprovação antes de merge

---

## ✅ Assinatura de Aprovação

- [ ] **Todos os testes passaram**
- [ ] **Payloads verificados e corretos**
- [ ] **Sem regressões identificadas**
- [ ] **Documentação atualizada**

**Testado por**: _________________  
**Data**: _________________  
**Aprovado para Merge**: ☐ Sim  ☐ Não (motivo: _________________)
