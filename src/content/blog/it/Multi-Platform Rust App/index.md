---
title: Costruire un'Applicazione Multi-Piattaforma in Rust con lo Schema di Shamir
description: Un viaggio attraverso lo sviluppo di una singola applicazione Rust che funziona su piattaforme web, desktop e CLI, utilizzando framework e best practice moderne.
image: "1.png"
imageAlt: "Un'illustrazione vettoriale pulita e minimalista che rappresenta lo sviluppo software multi-piattaforma utilizzando Rust"
imageSize: "md"
pubDate: 2024-03-29
duration: 13m
tags:
  - made-with-obsidian
  - rust
  - leptos
  - slint
  - clap
  - shamir-secret-sharing
draft: false
lang: it
redirect: ""
video: false
---

# Introduzione

Lo sviluppo software moderno richiede spesso applicazioni che funzionino perfettamente su diverse piattaforme e interfacce. Questo articolo esplora come sfruttare l'ecosistema Rust per costruire una singola applicazione che funzioni efficacemente su ambienti web, desktop e da riga di comando. Useremo lo Schema di Condivisione dei Segreti di Shamir (SSS) come caso d'uso pratico, dimostrando come:

1. Progettare un'architettura modulare che condivida la logica core
2. Implementare interfacce specifiche per piattaforma usando framework Rust moderni
3. Gestire considerazioni di sicurezza e testing su più piattaforme
4. Bilanciare esperienza utente e vincoli tecnici

# Panoramica dell'Architettura

## Strategia Multi-Piattaforma
La nostra applicazione dimostra tre approcci chiave allo sviluppo cross-platform:

1. **Logica di Business Core**
   - Libreria Rust indipendente dalla piattaforma
   - Tipi e interfacce condivise
   - Comportamento consistente su tutte le piattaforme

2. **Adattatori per Piattaforma**
   - Web: Leptos per interfacce web reattive
   - Desktop: Slint per GUI native
   - CLI: Clap per parsing da riga di comando

3. **Ottimizzazioni Specifiche per Piattaforma**
   - Strategie di gestione della memoria per piattaforma
   - Adattamenti UI/UX per ogni target
   - Gestione errori specifica per piattaforma

# Schema di Shamir: Il Nostro Caso d'Uso

### Logica Core

```rust
use shamir::SecretSharing;

pub fn generate_shares(secret: &[u8], threshold: usize, share_count: usize) -> Result<Vec<(usize, Vec<u8>)>, String> {
    if threshold > share_count {
        return Err("Threshold cannot be greater than the number of shares.".to_string());
    }

    let sharing = SecretSharing::new(threshold, share_count);
    sharing.split_secret(secret).map_err(|e| e.to_string())
}
```
#### Reconstructing the Secret

```rust
pub fn reconstruct_secret(shares: &[(usize, Vec<u8>)], threshold: usize) -> Result<Vec<u8>, String> {
    let sharing = SecretSharing::new(threshold, shares.len());
    sharing.reconstruct_secret(shares).map_err(|e| e.to_string())
}
```

# Sfide Specifiche per Piattaforma

## Piattaforma Web
- Gestione dello stato tra client e server
- Gestione dei vincoli di sicurezza del browser
- Ottimizzazione per diverse dimensioni dello schermo

## GUI Desktop
- Look and feel nativo su diversi sistemi operativi
- Gestione delle risorse e performance
- Punti di integrazione con il sistema

## Interfaccia CLI
- Esperienza consistente tra diverse shell
- Considerazioni su streaming input/output
- Integrazione con strumenti di sistema

### Versione CLI

```rust
use clap::{App, Arg};
use my_lib::{generate_shares, reconstruct_secret};

fn main() {
    let matches = App::new("Secret Sharing")
        .version("1.0")
        .about("Shamir's Secret Sharing CLI")
        .subcommand(
            App::new("generate")
                .about("Generate shares")
                .arg(Arg::new("secret").required(true))
                .arg(Arg::new("threshold").required(true))
                .arg(Arg::new("shares").required(true))
        )
        .subcommand(
            App::new("reconstruct")
                .about("Reconstruct a secret")
                .arg(Arg::new("shares").required(true))
        )
        .get_matches();

    if let Some(generate_matches) = matches.subcommand_matches("generate") {
        let secret = generate_matches.value_of("secret").unwrap();
        let threshold = generate_matches.value_of("threshold").unwrap().parse().unwrap();
        let share_count = generate_matches.value_of("shares").unwrap().parse().unwrap();

        let shares = generate_shares(secret.as_bytes(), threshold, share_count);
        println!("{:?}", shares);
    }

    if let Some(reconstruct_matches) = matches.subcommand_matches("reconstruct") {
        let shares: Vec<(usize, Vec<u8>)> = parse_shares(reconstruct_matches.value_of("shares").unwrap());
        let secret = reconstruct_secret(&shares, shares.len());
        println!("{:?}", secret);
    }
}
```
### Versione GUI

```slint
import { VerticalBox, LineEdit, Button, TextArea } from "std-widgets.slint";

export component MainWindow {
    callback generate_shares();
    callback reconstruct_secret();

    in-out property <string> secret_input;
    in-out property <string> threshold_input;
    in-out property <string> share_count_input;
    in-out property <string> output;

    VerticalBox {
        LineEdit { text <=> secret_input; placeholder: "Enter your secret"; }
        LineEdit { text <=> threshold_input; placeholder: "Enter threshold"; }
        LineEdit { text <=> share_count_input; placeholder: "Enter number of shares"; }
        Button { text: "Generate Shares"; clicked => root.generate_shares(); }
        Button { text: "Reconstruct Secret"; clicked => root.reconstruct_secret(); }
        TextArea { read_only: true; text <=> output; }
    }
}
```

### Versione Web

```rust
use leptos::*;

#[component]
fn App(cx: Scope) -> impl IntoView {
    let secret = create_signal(cx, String::new());
    let threshold = create_signal(cx, String::new());
    let share_count = create_signal(cx, String::new());
    let output = create_signal(cx, String::new());

    let generate_shares = move || {
        let secret = secret.get();
        let threshold: usize = threshold.get().parse().unwrap_or(0);
        let share_count: usize = share_count.get().parse().unwrap_or(0);

        match generate_shares(secret.as_bytes(), threshold, share_count) {
            Ok(shares) => output.set(format!("{:?}", shares)),
            Err(e) => output.set(format!("Error: {}", e)),
        }
    };

    view! {
        cx,
        input { on:input=move |ev| secret.set(event_target_value(&ev)), placeholder="Enter your secret" }
        input { on:input=move |ev| threshold.set(event_target_value(&ev)), placeholder="Enter threshold" }
        input { on:input=move |ev| share_count.set(event_target_value(&ev)), placeholder="Enter number of shares" }
        button { on:click=generate_shares, "Generate Shares" }
        textarea { value=output.get() }
    }
}
```

# Considerazioni sulla Sicurezza

L'implementazione dello Schema di Shamir in un ambiente di produzione richiede attenzione particolare alla sicurezza. Ecco alcuni punti chiave:

1. **Generazione Sicura di Numeri Casuali**
   La sicurezza delle parti dipende dalla casualità dei coefficienti polinomiali.

2. **Gestione della Memoria**
   I dati sensibili devono essere gestiti con attenzione per prevenire fughe.

3. **Raccolta di Entropia**
   Le applicazioni cross-platform devono garantire sufficiente entropia per la generazione sicura di numeri casuali.

4. **Gestione Type-Safe delle Parti**
   Usare il sistema di tipi di Rust per garantire una gestione corretta delle parti.

# Risultati e Riflessioni

La costruzione di un'applicazione multi-piattaforma in Rust ha riaffermato diversi principi di design del software:

1. **La Modularità Ripaga**
   La separazione tra logica core e specifiche di piattaforma ha semplificato sviluppo e manutenzione.

2. **L'Ecosistema Rust è Eccezionale**
   Strumenti come Slint, Leptos e Clap mostrano le ampie possibilità di Rust.

3. **La Sicurezza è Sempre un Compromesso**
   L'implementazione dell'algoritmo di Shamir ha richiesto attenzione meticolosa ai dettagli.

Questo progetto non solo ha raggiunto i suoi obiettivi ma ha anche evidenziato la versatilità di Rust nella gestione di requisiti software diversificati.
