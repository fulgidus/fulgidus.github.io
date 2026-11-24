---
marp: true
theme: site
paginate: true
size: 16:9
title: "Slides with Markdown: An Introduction to Marp"
description: "Learn how to create beautiful presentations using just Markdown"
---

# Slides with Markdown
## An Introduction to Marp

**Marp** — Markdown Presentation Ecosystem

<!-- _footer: fulgidus.github.io -->

---

## What is Marp?

- **Markdown-based** slide deck framework
- Write slides in plain text
- Export to **HTML**, **PDF**, and **PPTX**
- Built-in themes and customization
- Open source ecosystem

---

## Why Marp?

| Feature | PowerPoint | Google Slides | Marp |
|---------|-----------|---------------|------|
| Version control | ❌ | ❌ | ✅ |
| Plain text | ❌ | ❌ | ✅ |
| CLI export | ❌ | ❌ | ✅ |
| Collaboration | ⚠️ | ✅ | ✅ |
| Offline | ✅ | ❌ | ✅ |

---

## Getting Started

A Marp file is just Markdown with a special frontmatter:

```yaml
---
marp: true
theme: default
paginate: true
---
```

Each slide is separated by `---` (horizontal rule).

---

## Text Formatting

You can use all standard Markdown:

- **Bold text** and *italic text*
- `inline code` and code blocks
- [Links](https://marp.app)
- Lists (like this one!)

> Blockquotes work too, and they look great in presentations.

---

## Code Blocks

```typescript
function greet(name: string): string {
  return `Hello, ${name}!`;
}

// Marp renders syntax-highlighted code
console.log(greet("TorinoJS"));
```

Syntax highlighting is built-in for all major languages.

---

## Directives

Marp supports **directives** for fine-grained control:

```markdown
<!-- _backgroundColor: #1e1e1e -->
<!-- _color: white -->
<!-- _paginate: false -->
```

Prefixed with `_` for **local** (current slide only),
or without prefix for **global** (all subsequent slides).

---

<!-- _class: invert -->

## Dark Slide Example

This slide uses the `.invert` class from our custom theme:

- Matches the site's dark mode palette
- Background: `#0d1117`, Text: `#bbbbbb`

Directives give you per-slide customization without leaving Markdown.

---

## Images

Standard Markdown image syntax:

```markdown
![width:500px](./image.png)
```

Marp adds **image filters**:
- `![width:300px]` — set width
- `![height:200px]` — set height
- `![bg]` — background image
- `![bg right:40%]` — split layout

---

## Math Support

Marp supports LaTeX math via KaTeX:

Inline: $E = mc^2$

Block:

$$
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
$$

---

## Presenter Notes

Add notes that only you can see:

```markdown
<!-- This is a presenter note -->
```

Notes appear in presenter view but not in the slides.

<!-- This is an actual presenter note! Only visible in presenter mode. -->

---

## Export Formats

Marp can export to multiple formats:

- 📄 **HTML** — self-contained web page
- 📋 **PDF** — for printing and sharing
- 📊 **PPTX** — for PowerPoint users
- 📝 **Markdown** — the original source

All built at compile time, no runtime dependencies.

---

<!-- _class: highlight -->

## Custom Theme Classes

The **site** theme includes special slide classes:

- `lead` — centered title slides
- `invert` — dark mode palette
- `highlight` — brand accent background (like this slide!)

Use `<!-- _class: className -->` to apply.

---

<!-- _class: lead -->

# Thank You!

**Try Marp today** — write your next presentation in Markdown.

🔗 [marp.app](https://marp.app)
📦 [github.com/marp-team](https://github.com/marp-team)

<!-- _footer: Made with ❤️ and Markdown -->
