import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
    base: command === 'serve' ? '/' : '/vocab_tower_defence/',
}));