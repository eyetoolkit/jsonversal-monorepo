/**
 * 共享 SEO 配置 —— 每个子站独立 title / description / og
 */

import { tokens } from './tokens.js';

export const sitesSEO = {
  main: {
    title: tokens.sites.main.title,
    description: 'Free browser-based JSON & LLM developer tools. JSON to Zod, JSON Schema for structured output, LLM token calculator, JSON to TypeScript, UUID v7. No signup, no upload — your data never leaves your device.',
    og: { type: 'website', siteName: 'jsonversal', image: 'https://jsonversal.com/og-image.png' },
    keywords: 'JSON to Zod, JSON Schema generator, LLM token calculator, JSON to TypeScript, UUID v7, JSON tools, developer tools, structured output',
    canonical: `https://${tokens.sites.main.host}/`,
  },
  devops: {
    title: tokens.sites.devops.title,
    description: 'Free browser-based DevOps tools. YAML/JSON converter, Base64, crontab, JWT decoder, regex tester — all running in your browser.',
    og: { type: 'website', siteName: 'jsonversal' },
    keywords: 'YAML to JSON, Base64 encoder, JWT decoder, crontab, regex tester, DevOps tools',
    canonical: 'https://jsonversal.com/devops/',
  },
  codegen: {
    title: tokens.sites.codegen.title,
    description: 'Free browser-based code generators. .gitignore, license, README, CI workflow, commit message — generate in your browser.',
    og: { type: 'website', siteName: 'jsonversal' },
    keywords: '.gitignore generator, license generator, README generator, CI workflow, commit message',
    canonical: 'https://jsonversal.com/codegen/',
  },
  sec: {
    title: tokens.sites.sec.title,
    description: 'Free browser-based security tools. Hash, AES encryption, password strength, CSP generator, CSR decoder — all running in your browser.',
    og: { type: 'website', siteName: 'jsonversal' },
    keywords: 'hash generator, AES encryption, password strength, CSP generator, CSR decoder, security tools',
    canonical: 'https://jsonversal.com/sec/',
  },
};

export default sitesSEO;