---
title: "Yet Another Rust SSG"
description: A personal journey into Rust through building a simple static site generator. "Yet Another Rust SSG" is not a production-ready tool—it’s a learning project born from curiosity and the desire to build something real in Rust. In this article, I share how I created a basic static site generator from scratch, what I learned about Rust along the way, and why sometimes building your own primitive tools is more rewarding than using polished ones.
image: cover.png
imageAlt: Cover
imageSize: md
pubDate: 2025-03-21T09:52:49
duration: 5m
tags:
  - rust
  - web-development
  - tutorial
  - professional-development
  - best-practices
  - type-safety
  - frontend
  - development-patterns
  - content-creation
draft: false
lang: en
redirect: ""
unlisted: false
video: false
---
## 🚀 A Personal Detour into Rust

When I first started learning Rust, I did what most developers do: I went through the official book, wrote a few small CLI tools, played around with ownership and lifetimes, and got used to the compiler yelling at me. But eventually, I hit that point where I wanted to build something "real"—something that had a bit of structure, some actual user-facing output, and forced me to deal with files, rendering, and maybe even some HTML.

So I built a static site generator.

Not because the world needs yet another one. It doesn’t.

There are already *great* SSGs out there. Tools like [Hugo](https://gohugo.io), [Jekyll](https://jekyllrb.com), [Zola](https://www.getzola.org), and [Astro](https://astro.build) are mature, fast, flexible, and widely used.

Mine, by contrast, is extremely limited. It doesn’t support advanced templating, multilingual content, dynamic routing, or plugins. There’s no build system, no fancy config file, no extensibility. So why do it?

The short answer is: **I wanted to build something useful while writing Rust.**  
The long answer is: **I wanted to learn Rust by applying it to something that mirrors real-world problems**, while also scratching a personal itch: having a site generator I fully understand, top to bottom.

---

## 🛠️ How It Works

The basic idea is simple. I have a `content/` folder with Markdown files, and I want a program that converts them into styled HTML pages and saves them into a `dist/` directory.

Here’s what I ended up building:

- The program scans `content/pages/` and `content/blog/` for `.md` files.
- Each file can optionally include **frontmatter** in YAML format (for things like title and tags).
- Markdown content is rendered to HTML using a Rust Markdown parser.
- Each post or page is passed into a **Tera** template and rendered into a full HTML file.
- All pages are saved to `dist/`, and a homepage is generated linking to everything.
- Static assets like CSS and images are copied from `static/` to `dist/`.

It's not a big or particularly complex program, but it's just complex enough to require me to work with:

- Reading and writing files
- Parsing and extracting frontmatter
- Transforming Markdown to HTML
- Using templates and inserting dynamic content
- Managing folder structures and paths
- Implementing a local dev server (with hot reload!)
- Handling modes for development and production

I used no frameworks. Just the standard library, a handful of crates (`tera`, `pulldown-cmark`, `notify`, `warp`, `serde`, etc.), and a growing appreciation for Rust’s ergonomics (and quirks).

---

## 🌗 Aesthetic Touches: Dark Mode and Styling

This wasn't just about back-end logic. I also wanted the generated site to look nice.

So I added:

- A custom **CSS theme** built around a dark blue palette
- A **dark mode toggle** with a styled switch and local storage persistence
- Clean, responsive layout with a minimal aesthetic
- Syntax highlighting (coming soon)

Styling was mostly an exercise in CSS (not Rust), but it made the whole thing feel like a real website rather than just a bunch of raw HTML.

And yes, I admit it: I enjoyed tweaking the toggle animation way more than necessary.

---

## 🔄 Hot Reload, Because Why Not?

One feature I really enjoyed building was **hot reload**. In development mode, the SSG:

- Starts a local web server using `warp`
- Watches the `content/` directory for changes using `notify`
- Regenerates the site automatically when files are saved
- Notifies the browser via a WebSocket, triggering an automatic page refresh

This would have been a fun challenge because it required integrating multiple async workflows: file watching, content rebuilding, and WebSocket messaging—all in Rust. It was also one of the first times I felt *really comfortable* writing asynchronous Rust code.

Pity it doesn't work.

Sure, it would have not been as seamless as Vite or Astro, but it'd be nice to have. But I built it from scratch, in a language I’m still learning. I'll eventually get it right.

---

## 🔒 Production Mode: `--prod`

In development mode, everything is geared toward speed and visibility. In production mode, it’s the opposite: no server, no hot reload, and the output is **minified** to reduce file size.

Running the SSG with `--prod` will:

- Skip starting the server
- Minify the generated HTML using `minify-html`
- Omit the WebSocket script used for hot reload

This separation keeps the build clean and the development experience pleasant.

---

## 📦 Deployment

Once everything is generated, deploying the site is trivial. The `dist/` folder is ready to go:

- Drop it into GitHub Pages
- Upload it to Netlify
- Serve it from an S3 bucket
- Deploy it with rsync to your own VPS

It’s one of the reasons I love static sites: **zero infrastructure**. No database, no backend, no dependencies. Just HTML, CSS, and optionally a bit of JS.

---

## 🧠 What I Learned

This project taught me a lot. It wasn’t always smooth sailing, but Rust’s compiler is a great teacher. Over the course of building this SSG, I got better at:

- Managing ownership and borrowing across multiple modules
- Designing simple abstractions that make the code easier to extend
- Handling async code with `tokio`
- Using enums and pattern matching to model optional metadata
- Reading documentation and digging into crate internals when necessary

It also taught me patience. And persistence. And how to read compiler errors like a second language.

---

## 🎯 What This Is Not

This is not:

- A complete alternative to Hugo, Zola, Astro, or Eleventy
- A framework meant for production use
- A general-purpose SSG for other developers

This **is**:

- A personal project, born out of curiosity
- A learning exercise that turned into something functional
- A chance to create something from scratch with Rust, and see it live in the browser

And honestly, that’s enough.

---

## ✨ Conclusion

Building "Yet Another Rust SSG" wasn’t about creating the best tool out there. It was about building *something*, and learning Rust in the process.

I’m proud of what I built—not because it’s better than the tools that already exist, but because **it’s mine**. I understand every line of it. I fought with every borrow checker complaint. I added every feature one commit at a time.

If you're learning Rust and want a project that forces you to engage with the language meaningfully, I highly recommend building your own static site generator. It doesn’t have to be pretty. It doesn’t have to be fast. It just has to exist. And if it helps you learn, then it has already succeeded.

---

> Thanks for reading.  
>  
> The source code is available on https://github.com/fulgidus/yet-another-rust-ssg. 😄  
