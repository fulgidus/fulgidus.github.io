---
title: Building a Multi-Platform Rust App with Shamir's Secret Sharing
description: A journey through developing a single Rust application that targets web, desktop and CLI platforms, using modern frameworks and best practices.
image: "1.png"
imageAlt: "A clean and minimalistic vector illustration representing multi-platform software development using Rust"
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
lang: en
redirect: ""
video: false
---

# Introduction

Modern software development often requires applications to run seamlessly across different platforms and interfaces. This article explores how to leverage Rust's ecosystem to build a single application that works effectively on web, desktop, and command-line environments. We'll use Shamir's Secret Sharing (SSS) as our practical use case, demonstrating how to:

1. Design a modular architecture that shares core logic
2. Implement platform-specific interfaces using modern Rust frameworks
3. Handle security and testing considerations across platforms
4. Balance user experience with technical constraints

# Architecture Overview

## Multi-Platform Strategy
Our application demonstrates three key approaches to cross-platform development:

1. **Core Business Logic**
   - Platform-agnostic Rust library
   - Shared types and interfaces
   - Consistent behavior across platforms

2. **Platform Adapters**
   - Web: Leptos for reactive web interfaces
   - Desktop: Slint for native GUI
   - CLI: Clap for command-line parsing

3. **Platform-Specific Optimizations**
   - Memory management strategies per platform
   - UI/UX adaptations for each target
   - Platform-specific error handling

# Shamir's Secret Sharing: Our Use Case

We chose SSS as our core functionality because it provides:
- A non-trivial algorithm to demonstrate proper code organization
- Clear separation between business logic and UI concerns
- Interesting security considerations across platforms
- Meaningful test cases and error handling scenarios

# Implementation Details

## Modular Architecture

Our application follows a layered architecture:

1. **Core Library Layer**
   - Platform-agnostic business logic
   - Pure Rust implementation of SSS
   - Shared types and interfaces

2. **Platform Adaptation Layer**
   - Platform-specific data handling
   - UI state management
   - Error handling and formatting

3. **Presentation Layer**
   - Web interface (Leptos)
   - Desktop GUI (Slint)
   - CLI interface (Clap)

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

# Platform-Specific Challenges

## Web Platform
- Managing state between client and server
- Handling browser security constraints
- Optimizing for different screen sizes

## Desktop GUI
- Native look and feel across operating systems
- Resource management and performance
- System integration points

## CLI Interface
- Consistent experience across shells
- Input/output streaming considerations
- Integration with system tools

# Security Considerations

Implementing Shamir's Secret Sharing in a production environment requires careful attention to security. Here are some key considerations:

1. **Secure Random Number Generation**
   The security of the shares depends on the randomness of the polynomial coefficients. Using a cryptographically secure random number generator is essential.

2. **Memory Management**
   Sensitive data should be handled carefully in memory to prevent leaks. This includes zeroing out memory after use and avoiding unnecessary copies.

3. **Entropy Gathering**
   Cross-platform applications must ensure they gather sufficient entropy for secure random number generation, which can vary between operating systems.

4. **Type-Safe Share Management**
   Using Rust's type system to enforce correct handling of shares can prevent logical errors and improve code safety.

# Testing

Testing cryptographic code requires a rigorous approach to ensure correctness and security. Here are some strategies:

1. **Unit Tests**
   Write unit tests for individual functions, including edge cases and invalid inputs.

2. **Integration Tests**
   Test the complete workflow of generating and reconstructing shares to ensure all components work together correctly.

3. **Fuzz Testing**
   Use fuzz testing to discover edge cases and potential vulnerabilities by providing random inputs to the functions.

4. **Code Reviews**
   Regular code reviews by peers can help identify potential issues and improve code quality.

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
