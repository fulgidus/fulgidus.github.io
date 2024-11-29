---
title: Building a Secure Email Obfuscator Component with Vue.js and Astro
description: A Vue.js 3 Component for Astro that Protects Email Addresses from Automated Scraping Bots
pubDate: 2024-11-19T22:26:47
image: ./hero-2.png
tags:
  - made-with-obsidian
  - astro
  - vuejs
  - ssr
  - email
  - tutorial
imageAlt: Email address protection with Vue.js and Astro
imageSize: md
duration: 8m
draft: false
---

# Costruire un Componente Email Obfuscator Sicuro con Vue.js e Astro

## Introduzione

Hai mai notato quanto velocemente un indirizzo email pubblicato pubblicamente viene inondato di spam? I bot stanno costantemente scansionando il web, alla ricerca di indirizzi email da aggiungere alle loro liste di spam. Risolviamo questo problema costruendo un componente Vue.js che mantiene gli indirizzi email al sicuro da questi fastidiosi scraper, assicurando al contempo che gli utenti reali possano ancora raggiungerti.

## Perché Ne Abbiamo Bisogno?

I bot spam diventano più intelligenti ogni giorno. Setacciano i siti web alla ricerca di qualsiasi cosa che assomigli a un indirizzo email - che sia in testo semplice, nascosto in un link mailto o inserito in un modulo di contatto. Una volta trovata un'email, è probabile che finisca nei database di spam o, peggio ancora, diventi un obiettivo per attacchi di phishing.

Le soluzioni tradizionali come l'uso di immagini o semplici trucchi JavaScript non sono più sufficienti. Abbiamo bisogno di qualcosa di più robusto che funzioni per tutti - anche per le persone con esigenze di accessibilità (a11y).

## Costruendo la Soluzione

Creiamo `EmailObfuscator.vue`, un componente che codifica gli indirizzi email sul server e li decodifica in modo sicuro per gli utenti reali.

Ecco come lo faremo:

### Il Componente

Ecco il nostro componente Vue in tutto il suo splendore:

```vue
<script setup>
import { onMounted, ref } from 'vue'

const props = defineProps({
  emailEntities: {
    type: String,
    required: true,
  },
})

const decodedEmail = ref('')

onMounted(() => {
  const decoder = document.createElement('textarea')
  decoder.innerHTML = props.emailEntities
  decodedEmail.value = decoder.textContent.trim()
})
</script>

<template>
  <a v-if="decodedEmail" :href="`mailto:${decodedEmail}`">
    <slot>
      {{ decodedEmail }}
    </slot>
  </a>
  <slot v-else name="fallback">
    Indirizzo email protetto
  </slot>
</template>
```

### Come Funziona?

#### Codifica
Stiamo trasformando ogni carattere dell'email nel suo equivalente entità HTML. È come scrivere in un codice segreto che i bot di solito non sono addestrati a capire, ma i browser possono facilmente decodificare. Ecco cosa succede dietro le quinte:

```javascript
const email = 'contact@example.com';
const encoded = Array.from(email)
  .map(char => `&#${char.charCodeAt(0)};`)
  .join('');
// Si trasforma in: &#99;&#111;&#110;&#116;&#97;&#99;&#116;&#64;...
```

#### Decodifica Sicura
Quando una persona reale visita il tuo sito, il suo browser decodifica silenziosamente l'email nella sua forma leggibile. Utilizziamo il parsing HTML integrato del browser per gestire questo processo in modo sicuro ed efficiente.

#### Piano di Fallback
Non tutti navigano con JavaScript abilitato. Il nostro componente ha previsto questo con un fallback pulito che protegge comunque l'indirizzo email offrendo ai visitatori modi alternativi per mettersi in contatto.

### Utilizzo con Astro

Astro rende il nostro componente ancora migliore con il suo rendering lato server. Ecco come integrarlo:

```astro
---
import EmailObfuscator from '@/components/EmailObfuscator.vue'

// Codifica l'email lato server
const email = 'contact@example.com'
const emailEntities = Array.from(email)
  .map((char) => `&#${char.charCodeAt(0)};`)
  .join('')
---

<section class="contact-section">
  <h2>Mettiti in Contatto</h2>
  <EmailObfuscator 
    emailEntities={emailEntities} 
    client:only="vue"
  >
    <span slot="fallback">
      Prova il nostro modulo di contatto qui sotto
    </span>
  </EmailObfuscator>
</section>
```

### Vediamolo in Azione

Ecco come appare in diversi scenari:

1. Senza JavaScript:
- *Mantiene la tua email al sicuro quando JavaScript è disattivato*

2. Con JavaScript:
- *Link email pulito e cliccabile per i visitatori regolari*

## Mantenerlo Sicuro

Vuoi renderlo ancora più sicuro? Ecco alcuni passaggi extra che potresti considerare:
- Aggiungere limitazione della velocità per prevenire accessi rapidi
- Inserire un CAPTCHA per una protezione extra
- Tenere d'occhio i modelli di accesso insoliti
- Variare i modelli di codifica di tanto in tanto

## Prestazioni? Nessuna Preoccupazione

Questa soluzione è leggera come una piuma:
- Impronta di codice minima (circa 1KB minificato)
- Carica solo quando necessario
- Nessuna libreria extra richiesta
- Gestione intelligente degli aggiornamenti DOM

## Conclusione

Abbiamo costruito una soluzione solida che mantiene gli indirizzi email al sicuro senza rendere la vita difficile agli utenti reali. La combinazione di Vue.js e Astro ci dà un componente veloce e sicuro pronto per il mondo reale.

Vuoi andare oltre? Potresti:
- Aggiungere i tuoi trucchi di codifica
- Monitorare come viene utilizzato
- Testare approcci diversi
- Renderlo ancora più accessibile

⚠️ Ricorda, questo è solo un pezzo del puzzle della sicurezza. Usalo insieme ad altre buone pratiche di sicurezza per la migliore protezione.
