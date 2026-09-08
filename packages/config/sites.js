/**
 * ?? SEO ?? -- ?????? title / description / og
 */

import { tokens } from './tokens.js';

export const sitesSEO = {
  main: {
    title: tokens.sites.main.title,
    description: 'Free browser-based developer tools. No signup, no upload - your data never leaves your device.',
    og: { type: 'website', siteName: 'jsonversal' },
    keywords: 'JSON formatter, JSON validator, JSON tools, developer tools, browser tools',
    canonical: `https://${tokens.sites.main.host}/`,
  },
  devops: {
    title: tokens.sites.devops.title,
    description: 'Free browser-based DevOps tools. YAML/JSON converter, Base64, crontab, JWT decoder, regex tester - all running in your browser.',
    og: { type: 'website', siteName: tokens.sites.devops.name },
    keywords: 'YAML to JSON, Base64 encoder, JWT decoder, crontab, regex tester, DevOps tools',
    canonical: `https://${tokens.sites.devops.host}/`,
  },
  codegen: {
    title: tokens.sites.codegen.title,
    description: 'Free browser-based code generators. .gitignore, license, README, CI workflow, commit message - generate in your browser.',
    og: { type: 'website', siteName: tokens.sites.codegen.name },
    keywords: '.gitignore generator, license generator, README generator, CI workflow, commit message',
    canonical: `https://${tokens.sites.codegen.host}/`,
  },
  sec: {
    title: tokens.sites.sec.title,
    description: 'Free browser-based security tools. Hash, AES encryption, password strength, CSP generator, CSR decoder - all running in your browser.',
    og: { type: 'website', siteName: tokens.sites.sec.name },
    keywords: 'hash generator, AES encryption, password strength, CSP generator, CSR decoder, security tools',
    canonical: `https://${tokens.sites.sec.host}/`,
  },
};

export default sitesSEO;