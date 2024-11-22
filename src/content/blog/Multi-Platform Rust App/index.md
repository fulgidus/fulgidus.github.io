---
title: Building a Multi-Platform Rust App with Shamir's Secret Sharing
description: Exploring the design and implementation of a multi-platform Rust application that leverages Shamir's Secret Sharing scheme to manage secure string reconstruction.
image: "1.png"
imageAlt: "A clean and minimalistic vector illustration representing multi-platform software development using Rust"
imageSize: "md"
pubDate: 2024-03-29
duration: 13min
tags:
  - made-with-obsidian
  - rust
  - leptos
  - slint
  - clap
  - shamir-secret-sharing
draft: false
lang: en
redirect: ""
video: false
---

# Introduction

In the world of secure software design, the ability to manage sensitive information, such as passwords or cryptographic keys, in a distributed yet reliable way is a recurring challenge. Shamir's Secret Sharing (SSS) algorithm offers an elegant solution, enabling us to split a secret into several parts, or shares, which can be distributed among participants. Any subset of those shares meeting a threshold can reconstruct the original secret, while a smaller set reveals nothing.

This post delves into the architecture, design, and implementation of a multi-platform Rust application built around this concept. The app not only demonstrates Rust's versatility but also showcases how Shamir's algorithm can be embedded into real-world software with robust cross-platform support. We'll explore how the app supports:

1. **A full-stack web version** using `Leptos` for serving a dynamic interface.
2. **A standalone GUI** built with `Slint`, providing a sleek, native-like user interface for multiple platforms.
3. **A command-line version** leveraging `Clap` for a lightweight, terminal-based experience.

Each version of the application is tailored to its environment but maintains a shared core logic, ensuring consistency and minimal duplication of effort.

# Objectives and Approach

The primary goal of this project was to implement a versatile application that could cater to different user needs and environments. Whether the user preferred the simplicity of a terminal, the visual feedback of a GUI, or the accessibility of a web interface, the app needed to provide a seamless experience. Achieving this required a modular architecture and careful separation of concerns.

### Core Features

1. **Secure Secret Sharing**
   At the heart of the application lies the implementation of Shamir's Secret Sharing algorithm. It allows users to:
   - Split a secret into `n` shares.
   - Specify a threshold, `t`, such that any `t` shares can reconstruct the secret.

2. **Multi-Platform Support**
   By leveraging Rust's ecosystem, we ensured that the app runs smoothly across different environments:
   - **Web:** A `Leptos`-powered server serves a responsive web application.
   - **GUI:** `Slint` provides an intuitive interface for users who prefer desktop applications.
   - **CLI:** `Clap` makes the tool accessible to terminal enthusiasts and automation scripts.

### Architectural Choices

A key consideration was keeping the business logic agnostic to the platform. To achieve this:
- **Core logic** (e.g., Shamir's algorithm) resides in a dedicated Rust library, reusable by all three versions of the app.
- **Platform-specific layers** handle UI, user input, and output formatting.
- **Modular design** minimizes redundancy and allows easy updates to the core functionality without disrupting platform-specific code.
-
# Implementation Details

### Core Logic

The core logic for Shamir's Secret Sharing is implemented in a dedicated Rust library. Here’s a simplified version of the functions for generating and reconstructing shares:

#### Generating Shares

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

These functions are reused across all versions of the app, ensuring consistent behavior.

### CLI Version
The CLI interface is built using `Clap`. Here’s how users can interact with it:

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
### GUI Version

The GUI, built with `Slint`, provides a user-friendly interface. Here's the updated `main.slint`:

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

The logic hooks into the callbacks to update the UI.

### Web Version

Using `Leptos`, we serve a dynamic interface. Here’s a simplified handler for generating shares:

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

# Results

The result is a highly functional application that adapts seamlessly to its target environments. Users can generate and distribute shares of a secret with a few clicks or commands, ensuring security and ease of use.

# Reflections and Learnings

Building a multi-platform application in Rust reaffirmed several principles of software design:

1. **Modularity Pays Off**
   Separating core logic from platform-specific concerns simplified development and maintenance, making the app extensible and easier to debug.

2. **Rust's Ecosystem is Exceptional**
   Tools like `Slint`, `Leptos`, and `Clap` showcase the breadth of possibilities with Rust. Each framework contributed unique strengths to the project.

3. **Security is Always a Balance**
   Implementing Shamir's algorithm required meticulous attention to detail, especially in ensuring the integrity and security of the shares during both generation and reconstruction.

This project not only met its goals but also highlighted the versatility of Rust in handling diverse software requirements. With its shared logic and tailored interfaces, the app is a testament to the power of modular and cross-platform development.
