import { defineConfig } from 'vitest/config';
import { resolve } from 'path';


export default defineConfig({
    test: {
        // ... any other test specific config such as globals, environment...
        environment: 'jsdom', // this adds jsdom support for using DOM elements if needed for your tests
        globals: true,
        setupFiles: './test/setup.ts', // path to setup file
    },
    resolve: {
        alias: {
            '@/': resolve(__dirname, 'src') + '/',
            'astro:content': resolve(__dirname, './test/empty.js'),
        },
    },
})

