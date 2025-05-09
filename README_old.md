## Features

- 100 / 100 Lighthouse performance.
- Responsive.
- SEO-friendly.
- Light / Dark Theme.
- Markdown support.
- <a target="_blank" href="https://mdxjs.com/">MDX</a> (components in your markdown) support.
- <a target="_blank" href="https://vuejs.org/">Vue</a> SFC component support.
- Auto generated sitemap and RSS Feed <a target="_blank" href="https://vueuse.org/">VueUse</a> & <a target="_blank" href="https://lodash.com/">Lodash</a> support.
- Use the <a target="_blank" href="https://unocss.dev/">UnoCSS</a> for style, it's fast.

## Lighthouse Performance

![Lighthouse Performance Image](./public/img/lighthouse.jpg)

## Quick Start

[![Deploy to Netlify Button](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/kevinwong865/astro-theme-vitesse)

Click this button, it will create a new repo for you that looks exactly like this one, and sets that repo up immediately for deployment on Netlify.

If you  just want to develop locally, you can [create a repo](https://github.com/kevinwong865/astro-theme-vitesse/generate) from this template on GitHub.

## Usage

First, install the dependencies.

```bash
npm install
```

Just run and visit http://localhost:1977.

```bash
npm run dev
```

> Node.js version 18 or higher is required for this project.

To build the App, you can run:

```bash
npm run build
```

You will then see the `dist` folder generated for publishing, which you can preview locally with the following command.

```bash
npm run preview
```

## Use pnpm / yarn

If you want to use pnpm or yarn as a package management tool, please refer to the following steps.

> If `preinstall` exists in `scripts`, remove it first.

### pnpm

Replace `"pre-commit": "npx lint-staged"` in package.json with `"pre-commit": "pnpm lint-staged"`.

And replace `"*": "npm run lint:fix"` with `"*": "pnpm lint:fix"`.

Like this:

```json
{
  // ...
  "simple-git-hooks": {
    "pre-commit": "pnpm lint-staged"
  },
  "lint-staged": {
    "*": "pnpm lint:fix"
  }
}
```

## License

[MIT License](./LICENSE) © 2024 [Alessio Corsi](https://github.com/fulgidus/)
