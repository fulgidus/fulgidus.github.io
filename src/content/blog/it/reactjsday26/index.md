---
title: "Cheap Output, Expensive Judgment"
description: "Slide e resoconto del mio talk a reactjsday 2026: l'AI ha reso l'output quasi gratuito, ma non il giudizio. Cosa significa per chi fa il lavoro, per chi lo riceve, per i nostri clienti e per il vecchio sogno di non aver più bisogno di persone competenti."
image: "../../reactjsday26/cover.jpg"
imageAlt: "Lewis Hine, meccanico di una centrale al lavoro su una pompa a vapore, 1920. Pubblico dominio."
imageSize: md
pubDate: 2026-11-23T19:00:00
tags:
  - talks
  - reactjsday
  - generative-ai
  - ai-tools
  - burnout
  - code-review
  - professional-development
  - best-practices
draft: false
lang: it
translationOf: "reactjsday26"
redirect: ""
unlisted: false
video: false
---
Questa è la versione scritta del lightning talk che ho tenuto a **reactjsday 2026**. Cinque minuti, quattro problemi, quattro cose da provare lunedì.

**[Apri le slide a schermo intero](/talks/reactjsday26/)** (le slide sono in inglese)

<iframe src="/talks/reactjsday26/" title="Cheap Output, Expensive Judgment: slide" loading="lazy" style="width:100%;aspect-ratio:16/9;border:0;border-radius:8px;" allowfullscreen></iframe>

Tutto il talk sta in una frase: **l'AI ha reso l'output quasi gratuito. Non ha reso gratuito il giudizio.** Il resto viene da lì.

## 1. Burnout da AI: lavoriamo di più, non di meno

L'AI ci è stata venduta come meno lavoro. Quello che abbiamo ottenuto è più lavoro, di un altro tipo. Scrivere è diventato controllare, e il controllo ora avviene su cinque fili contemporaneamente, come le centraliniste degli anni Cinquanta.

Basta un numero: secondo il LeadDev Engineering Leadership Report 2026, **il 53% degli ingegneri senior lavora più ore di prima dell'AI**. Un anno prima era il 28%. Le ricerche di UC Berkeley, BCG ("AI brain fry") e Oregon State University vanno nella stessa direzione: più flussi in parallelo, più cambi di contesto, più fatica.

**Cosa fare:** meno agenti in parallelo, e la review conta come lavoro vero, nelle stime e nella pianificazione. Se controllare è il lavoro, deve comparire sulla board.

## 2. Slop: lavoro che sembra finito e non lo è

Lo slop è output che sembra fatto e non lo è. Produrlo non costa niente. Verificarlo costa parecchio. Quindi il costo non sparisce: si sposta su chi lo riceve.

BetterUp Labs e lo Stanford Social Media Lab ci hanno messo un numero: **circa due ore** perse per ogni pezzo di "workslop" ricevuto, per verificarlo, correggerlo o rifarlo. Nell'open source l'effetto è ancora più visibile: i maintainer chiudono le contribuzioni perché non riescono a stare dietro a PR e segnalazioni generate (Linux Foundation Research, ottobre 2026).

**Cosa fare:** paga chi manda. *Se lo mandi, devi saperlo spiegare.* Ogni riga. Le prove arrivano prima della review, non durante.

## 3. Stratificare l'effort: restituisci l'impegno che ti è stato dato

Il terzo punto riguarda i clienti, e il proteggere sé stessi. Smista prima di rispondere, come in un ufficio postale:

- **Slop**: otto pagine di sproloquio generato che nessuno ha letto. La risposta la scrive Claude.
- **Domanda**: una domanda vera da una persona vera. Risponde una persona.
- **Rischio**: una decisione con conseguenze. Merita tutta la tua attenzione.

La tua attenzione, e la tua salute mentale, sono la risorsa scarsa. E respingi il "con l'AI dovrebbe essere facile, perché non è ancora pronto?". Generare non è mai stata la parte lenta. **"Con l'AI dovrebbe essere facile" non è una scadenza.**

## 4. Deskilling: il mestiere resta qualificato, la persona può perdere la competenza

COBOL, low-code, ora l'AI: ogni volta la promessa era "niente più programmatori". Ogni volta si è automatizzata la parte facile ed è rimasta quella difficile: sapere cosa costruire e verificare che sia giusto. Lisanne Bainbridge lo descriveva già nel 1983 in *Ironies of Automation*: più automatizzi, più quello che resta agli umani è la parte difficile.

Ma un rischio è reale. In un test di Anthropic sull'apprendimento di una nuova libreria, **chi ha scritto il codice a mano ha ottenuto il 67% al test successivo, chi l'ha lasciato scrivere all'AI il 50%**. La medicina mostra lo stesso schema: gli endoscopisti abituati all'assistenza dell'AI hanno performato peggio quando gli è stata tolta (*The Lancet Gastroenterology & Hepatology*, 2025).

Il mestiere resta qualificato. La persona può perdere la competenza. **Cosa fare:** esercitarsi senza AI, di proposito. I junior fanno debug a mano, prima.

## Per lunedì

L'output costa poco. Verificare è il lavoro.

1. **Limita i thread.** Pochi agenti in parallelo. La review conta come lavoro.
2. **Filtra lo slop.** L'autore spiega ogni riga. Prove prima della review.
3. **Adegua l'impegno.** Prima lo smistamento. Allo slop si risponde con lo slop. L'attenzione va alle persone.
4. **Mantieni la competenza.** Esercizio senza AI. I junior fanno debug a mano, prima.

È la competenza che fa la verifica. Proteggila.

## Fonti

- Ricercatori di UC Berkeley, studio di otto mesi su 200 dipendenti di un'azienda tech statunitense, febbraio 2026
- BCG, indagine "AI brain fry" su 1.488 lavoratori, marzo 2026
- LeadDev, Engineering Leadership Report 2026
- Oregon State University, AI generativa e burnout, 442 sviluppatori in 56 organizzazioni, 2026
- BetterUp Labs e Stanford Social Media Lab, indagine sul workslop su 1.150 lavoratori statunitensi, Harvard Business Review, settembre 2025
- Linux Foundation Research, indagine tra i maintainer sullo slop da AI, ottobre 2026
- Anthropic, "How AI assistance impacts the formation of coding skills", gennaio 2026
- Budzyń et al., deskilling degli endoscopisti dopo l'esposizione all'AI, *The Lancet Gastroenterology & Hepatology*, 2025
- Bainbridge, "Ironies of Automation", *Automatica*, 1983

Le fotografie delle slide sono di pubblico dominio, CC BY o senza restrizioni di copyright note, con i crediti su ogni slide, via Wikimedia Commons.
