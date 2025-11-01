---
title: "ZigNet: Come ho creato un server MCP per il linguaggio Zig in 1.5 giorni"
description: "Belle le AI, ma non stanno dietro allo sviluppo così rapido di Zig. Mi sono chiesto: cosa costerebbe farmene uno mio? La risposta mi ha sorpreso: con un sistema ibrido deterministico/stocastico, una RTX 3090 e 4.5 ore di training, ho creato un LLM specializzato che gira su un laptop normale."
image: ./zignet-cover.png
imageAlt: "Architettura ibrida di ZigNet che combina compilatore Zig e LLM"
imageSize: md
pubDate: 2025-11-01T10:30:00
duration: 12m
tags:
- zig
- mcp
- ai
- llm
- typescript
- machine-learning
- neural-networks
- open-source
- model-context-protocol
- fine-tuning
- qwen
- compiler-integration
- hybrid-systems
- local-ai
- developer-tools
draft: false
lang: it
redirect: ""
unlisted: false
video: false
---

## L'idea iniziale

Tutto è iniziato da una riflessione: "Belle le AI, ma non stanno dietro allo sviluppo così rapido di Zig". Gli LLM normali mi davano suggerimenti scadenti, confondevano sintassi vecchie con quelle nuove, inventavano API inesistenti. 

Mi sono chiesto: **cosa costerebbe farmene uno mio?**

Le domande che mi frullavano in testa erano:
- Quanto pesa far girare un LLM in locale? 
- Serve per forza un modello enorme o me la cavo con relativamente poco?
- Posso evitare di fare fine-tuning su tutto e concentrarmi solo su quello che serve?

Dopo un po' di ricerca, ho realizzato che la soluzione non era necessariamente un LLM gigante che sa tutto di Zig, ma un **sistema ibrido**:
- **50% deterministico**: Il compilatore Zig ufficiale per validazione e formattazione (100% accurato, zero allucinazioni)
- **50% stocastico**: Un LLM piccolo ma specializzato per suggerimenti e documentazione (dove un po' di creatività è OK)

È qui che entra in gioco il **Model Context Protocol (MCP)** di Anthropic. MCP mi permetteva di unire questi due mondi: dare a Claude accesso al compilatore Zig reale E a un modello specializzato, tutto in modo trasparente.

## L'esplorazione: Quanto costa davvero un LLM custom?

Prima di buttarmi nel codice, ho fatto i compiti a casa. Ecco cosa ho scoperto:

### Costo Hardware
- **Training**: RTX 3090 (24GB) - ce l'avevo già ✓
- **Inference locale**: 4-8GB RAM per un modello 7B quantizzato
- **Cloud training**: ~$50 su vast.ai per 4-5 ore (se non hai GPU)

### Dimensioni modelli (la sorpresa)
Ho testato vari modelli base:
```
Llama3.2-3B     → 2GB quantizzato  → Veloce ma stupido con Zig
CodeLlama-7B    → 4GB quantizzato  → Confonde Zig con Rust
Qwen2.5-7B      → 4GB quantizzato  → Ottimo! Capisce già Zig decentemente
Mistral-7B      → 4GB quantizzato  → Buono ma non eccelle
DeepSeek-33B    → 16GB quantizzato → Overkill per il mio use case
```

**La rivelazione**: Non serve GPT-4! Un 7B ben addestrato è più che sufficiente per un dominio specifico come Zig.

### Il piano ibrido
Invece di cercare di insegnare TUTTO al modello, ho diviso le responsabilità:

| Compito | Soluzione | Perché |
|---------|-----------|---------|
| Validazione sintassi | `zig ast-check` | 100% accurato, zero training |
| Formattazione | `zig fmt` | Standard ufficiale, deterministico |
| Documentazione | LLM fine-tuned | Serve creatività e contesto |
| Fix suggerimenti | LLM fine-tuned | Richiede comprensione semantica |
| Type checking | `zig ast-check` | Il compilatore sa meglio |

Questo approccio ha ridotto drasticamente i requisiti:
- **Training set**: Solo 13,756 esempi (invece di milioni)
- **Training time**: 4.5 ore (invece di settimane)
- **Model size**: 4.4GB finale (gira su un laptop decente)
- **Accuratezza**: 100% su sintassi, 95% su suggerimenti

## Perché Zig ha bisogno di ZigNet

Zig è un linguaggio giovane e in rapida evoluzione. Le sue caratteristiche uniche come `comptime`, la gestione degli errori esplicita e i generici lo rendono potente ma anche complesso da analizzare. Gli LLM tradizionali:

- **Non possono verificare la sintassi**: Possono suggerire codice che sembra corretto ma non compila
- **Non conoscono le ultime API**: Zig evolve rapidamente, le API cambiano tra versioni
- **Non possono formattare il codice**: Ogni progetto ha il suo stile, ma `zig fmt` è lo standard
- **Inventano funzioni inesistenti**: Senza accesso alla documentazione reale, gli LLM allucinano

ZigNet risolve questi problemi integrando direttamente il compilatore Zig ufficiale.

## L'architettura: Semplice ma efficace

```
┌────────────────────────────────────────────────────┐
│                 Claude / MCP Client                │
└────────────────────┬───────────────────────────────┘
                     │ MCP Protocol (JSON-RPC)
┌────────────────────▼───────────────────────────────┐
│            ZigNet MCP Server (TypeScript)          │
│  ┌──────────────────────────────────────────────┐  │
│  │              Tool Handlers                   │  │
│  │  - analyze_zig: Analisi sintattica e tipi    │  │
│  │  - compile_zig: Formattazione del codice     │  │
│  │  - get_zig_docs: Documentazione AI-powered   │  │
│  │  - suggest_fix: Suggerimenti intelligenti    │  │
│  └─────────────┬────────────────────────────────┘  │
│                ▼                                   │
│  ┌──────────────────────────────────────────────┐  │
│  │        Zig Compiler Integration              │  │
│  │  - zig ast-check (validazione sintassi/tipi) │  │
│  │  - zig fmt (formatter ufficiale)             │  │
│  │  - Multi-versione (0.13, 0.14, 0.15)         │  │
│  └─────────────┬────────────────────────────────┘  │
│                ▼                                   │
│  ┌──────────────────────────────────────────────┐  │
│  │     Fine-tuned LLM (Qwen2.5-Coder-7B)        │  │
│  │  - 13,756 esempi di training                 │  │
│  │  - Specializzato su idiomi Zig moderni       │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
```

### Decisione chiave #1: Usare il compilatore ufficiale

Invece di scrivere un parser custom (come fanno molti language server), ho deciso di usare direttamente il compilatore Zig:

```typescript
// src/zig/executor.ts
export class ZigExecutor {
  async analyze(code: string): Promise<AnalysisResult> {
    // Salva il codice in un file temporaneo
    const tempFile = await this.createTempFile(code);
    
    // Usa zig ast-check per l'analisi
    const result = await execAsync(
      `${this.zigPath} ast-check ${tempFile}`
    );
    
    // Parsa l'output del compilatore
    return this.parseCompilerOutput(result);
  }
}
```

**Vantaggi:**
- **100% accurato**: È lo stesso compilatore che userai per compilare
- **Sempre aggiornato**: Nessun ritardo nell'implementare nuove features
- **Zero manutenzione**: Quando esce Zig 0.16, funzionerà automaticamente

### Decisione chiave #2: Multi-versione intelligente

Gli sviluppatori Zig usano versioni diverse. ZigNet gestisce automaticamente:

```typescript
// src/zig/manager.ts
export class ZigManager {
  async getZigExecutable(version?: string): Promise<string> {
    // Prima controlla se Zig è installato nel sistema
    const systemZig = await this.findSystemZig();
    if (systemZig && (!version || systemZig.version === version)) {
      return systemZig.path;
    }
    
    // Altrimenti scarica la versione richiesta
    return this.downloadZig(version || 'latest');
  }
}
```

Il sistema di cache è intelligente:
- Rileva installazioni esistenti
- Scarica solo quando necessario
- Mantiene multiple versioni in parallelo
- Cache persistente tra sessioni

### Decisione chiave #3: LLM fine-tuned per Zig

Per le funzionalità avanzate (documentazione e suggerimenti), ho addestrato un modello specifico:

```python
# scripts/train-qwen-standard.py
def prepare_dataset():
    """13,756 esempi da repository Zig reali"""
    examples = []
    
    # 97% codice da GitHub (Zig 0.13-0.15)
    for repo in zig_repos:
        examples.extend(extract_zig_patterns(repo))
    
    # 3% documentazione ufficiale
    examples.extend(parse_zig_docs())
    
    return train_test_split(examples)
```

**Il processo di fine-tuning:**
1. **Base model**: Qwen2.5-Coder-7B-Instruct (migliore comprensione di Zig nei benchmark)
2. **Tecnica**: QLoRA 4-bit (training efficiente su RTX 3090)
3. **Dataset**: Focus su idiomi moderni (`comptime`, generici, error handling)
4. **Output**: Modello quantizzato Q4_K_M (~4GB per inference locale)

## Le sfide tecniche affrontate

### Sfida #1: Gestione degli errori del compilatore

Il compilatore Zig è verboso. Ho dovuto parsare output complessi:

```typescript
// Un errore tipico di Zig
error: expected type 'i32', found '[]const u8'
    const x: i32 = "hello";
             ^~~

// Il parser deve estrarre:
// - Tipo di errore
// - Posizione (linea, colonna)
// - Tipi coinvolti
// - Suggerimenti contestuali
```

### Sfida #2: Performance dell'LLM

L'inference di un modello 7B può essere lenta. Ottimizzazioni implementate:

```typescript
// src/llm/session.ts
export class LLMSession {
  private model: LlamaModel;
  private contextCache: Map<string, LlamaContext>;
  
  async suggest(code: string, error: string) {
    // Riusa contesti per query simili
    const cacheKey = this.getCacheKey(code, error);
    let context = this.contextCache.get(cacheKey);
    
    if (!context) {
      context = await this.model.createContext({
        contextSize: 2048,  // Limitato per velocità
        threads: 8,          // Parallelizzazione
      });
    }
    
    // Prompt engineering specifico per Zig
    const prompt = this.buildZigPrompt(code, error);
    return context.evaluate(prompt);
  }
}
```

**Risultati:**
- Prima query: ~15-20 secondi (caricamento modello)
- Query successive: ~2-3 secondi (con cache)
- Qualità suggerimenti: 95% utili nei test

### Sfida #3: Testing end-to-end

Come testare un sistema che dipende da compilatore + LLM?

```typescript
// tests/e2e/mcp-integration.test.ts
describe('ZigNet E2E Tests', () => {
  // Test deterministici (sempre eseguiti)
  test('analyze_zig - syntax error', async () => {
    const result = await mcp.call('analyze_zig', {
      code: 'fn main() { invalid syntax }'
    });
    expect(result.errors).toContain('expected');
  });
  
  // Test LLM (skip automatico se modello non presente)
  test('suggest_fix - type mismatch', async () => {
    if (!modelAvailable()) {
      console.log('Skipping LLM test - model not found');
      return;
    }
    
    const result = await mcp.call('suggest_fix', {
      code: 'var x: i32 = "hello";',
      error: 'type mismatch'
    });
    
    // Verifica che suggerisca almeno una fix valida
    expect(result.suggestions).toContainValidZigCode();
  });
});
```

**Strategia di testing:**
- **27 test totali**: 12 deterministici, 15 con LLM
- **CI/CD friendly**: I test LLM sono opzionali
- **Performance tracking**: Ogni test misura il tempo
- **Coverage completo**: Tutti i tool e edge case

## Integrazione con Claude: La magia MCP

L'integrazione è sorprendentemente semplice:

```json
// claude_desktop_config.json
{
  "mcpServers": {
    "zignet": {
      "command": "npx",
      "args": ["-y", "zignet"]
    }
  }
}
```

Una volta configurato, l'esperienza utente è naturale:

```
Tu: "Analizza questo codice Zig per errori"
[incolli il codice]

Claude: [usa analyze_zig automaticamente]
"Ho trovato 2 errori:
1. Linea 5: Type mismatch - variabile 'x' si aspetta i32 ma hai passato []const u8
2. Linea 12: Funzione 'prozess' non definita, forse intendevi 'process'?"

Tu: "Puoi formattarlo secondo lo standard?"

Claude: [usa compile_zig]
"Ecco il codice formattato con zig fmt:
[codice pulito e formattato]"
```

## Lezioni apprese

### 1. **Non serve un LLM gigante**
La mia più grande scoperta: per un dominio specifico come Zig, un modello 7B ben addestrato batte un GPT-4 generico. È questione di specializzazione, non di dimensioni.

### 2. **Ibrido > Puro ML**
Combinare strumenti deterministici (compilatore) con ML (suggerimenti) dà il meglio di entrambi i mondi: accuratezza dove serve, creatività dove aiuta.

### 3. **Il costo è accessibile**
Fine-tuning su consumer hardware? Fattibile! 
- RTX 3090: 4.5 ore di training effettive
- Inference: gira su laptop con 8GB RAM
- Alternativa: vast.ai o RunPod per chi non ha GPU (~$50 per il training completo)

### 4. **Riusa gli strumenti esistenti**
Il compilatore Zig fa già tutto quello che serve per validazione. Perché reinventare la ruota quando puoi concentrarti su quello che manca davvero?

### 5. **L'UX è tutto**
Gli utenti non devono sapere che c'è un sistema ibrido dietro. Deve essere trasparente e "magico".

### 6. **Test separati per componenti deterministici e stocastici**
I test del compilatore sono sempre riproducibili. I test LLM possono variare - pianifica di conseguenza.

### 7. **Open Source dal giorno 1**
Pubblicare il codice mi ha forzato a mantenere standard alti e documentazione chiara. Inoltre, la community Zig è fantastica per il feedback.

## Statistiche del progetto

- **Tempo di sviluppo**: 1.5 giorni
- **Dimensione modello**: 4.4GB (quantizzato)
- **Training time**: 4.5 ore su RTX 3090
- **Licenza**: WTFPL v2 (massima libertà)

## Conclusioni

ZigNet dimostra che **non servono GPT-4 o cluster da $100k per avere AI specializzata**. Con un approccio ibrido intelligente puoi ottenere risultati eccellenti:

- **Budget hardware**: RTX 3090 o $50 di cloud
- **Modello piccolo**: 7B parametri bastano e avanzano  
- **Sistema ibrido**: Compilatore per l'accuratezza, LLM per la creatività
- **Tempo ragionevole**: 1.5 giorni dalla idea al rilascio

La chiave è stata capire che non dovevo sostituire tutto con ML, ma solo le parti dove l'AI aggiunge valore reale:

1. **Identificare cosa può essere deterministico** (validazione → compilatore)
2. **Identificare cosa richiede "intelligenza"** (suggerimenti → LLM)
3. **Scegliere il modello giusto** (Qwen2.5-7B, non GPT-4)
4. **Training mirato** (13k esempi Zig, non miliardi generici)
5. **Integrazione seamless** (MCP fa la magia)

Il risultato? Un sistema che:
- **Gira in locale** su hardware consumer
- **È 100% accurato** sulla sintassi
- **È 95% utile** sui suggerimenti
- **Costa quasi zero** da mantenere

Se stai pensando "vorrei un LLM specializzato per X ma costa troppo", ripensaci. Con l'approccio giusto, probabilmente te la cavi con meno di quanto pensi.

Il codice è completamente open source. Se sei curioso di vedere come funziona davvero un sistema ibrido deterministico/stocastico, dai un'occhiata:

**Pacchetto per VSCode**: [https://marketplace.visualstudio.com/items?itemName=Fulgidus.zignet](https://marketplace.visualstudio.com/items?itemName=Fulgidus.zignet)  
**Repository**: [github.com/fulgidus/zignet](https://github.com/fulgidus/zignet)  
**Modello**: [huggingface.co/fulgidus/zignet-qwen2.5-coder-7b](https://huggingface.co/fulgidus/zignet-qwen2.5-coder-7b)

Hai domande? Vuoi fare qualcosa di simile per un altro linguaggio? Apri una issue su GitHub o contattami. Il progetto è WTFPL - fai letteralmente quello che vuoi con il codice!

---

*P.S.: La prossima volta che qualcuno ti dice che servono milioni per fare AI custom, mostragli ZigNet. A volte basta una GPU gaming, un weekend libero, e la voglia di provare. Il futuro dell'AI specializzata è accessibile a tutti. 🚀*