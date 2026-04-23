import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const COLORS = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m"
};

function log(msg: string, color = COLORS.reset) {
  console.log(`${color}${msg}${COLORS.reset}`);
}

async function runCheck() {
  log("🚀 Iniciando Auditoria de Saúde do EduFlow...", COLORS.cyan);
  let hasError = false;

  // 1. Verificação de Tipagem (TSC)
  log("\n📦 Verificando Tipagem (TypeScript)...", COLORS.blue);
  try {
    execSync('.\\node_modules\\.bin\\tsc.cmd --noEmit', { stdio: 'inherit' });
    log("✅ TypeScript OK", COLORS.green);
  } catch (e) {
    log("❌ Erros de Tipagem encontrados!", COLORS.red);
    hasError = true;
  }

  // 2. Verificação de Assets
  log("\n🖼️ Verificando Assets Críticos...", COLORS.blue);
  const criticalAssets = [
    'public/icon-192.png',
    'public/icon-512.png',
    'public/manifest.json',
  ];

  criticalAssets.forEach(asset => {
    if (fs.existsSync(path.resolve(process.cwd(), asset))) {
      log(`✅ ${asset}`, COLORS.green);
    } else {
      log(`❌ Faltando: ${asset}`, COLORS.red);
      hasError = true;
    }
  });

  // 3. Verificação de Variáveis de Ambiente
  log("\n🔑 Verificando Configurações (ENV)...", COLORS.blue);
  const requiredEnvs = [
    'VITE_FIREBASE_API_KEY',
    'GEMINI_API_KEY'
  ];

  requiredEnvs.forEach(env => {
    if (process.env[env] || fs.readFileSync('.env', 'utf-8').includes(env)) {
      log(`✅ ${env} configurada`, COLORS.green);
    } else {
      log(`⚠️ ${env} não encontrada nos arquivos locais`, COLORS.yellow);
    }
  });

  if (hasError) {
    log("\n👎 A auditoria encontrou problemas. Verifique os logs acima.", COLORS.red);
    process.exit(1);
  } else {
    log("\n🌟 Tudo limpo! O sistema está pronto para decolar.", COLORS.green);
    process.exit(0);
  }
}

runCheck();
