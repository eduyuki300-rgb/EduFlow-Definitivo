import { execSync } from 'child_process';
import chalk from 'chalk';

console.log(chalk.cyan.bold('\n🚀 Iniciando EduFlow UI Smoke Test...\n'));

try {
  // Executa os testes de forma headless e extrai o output
  // O --reporter=list gera um output mais limpo para parseamento
  execSync('npx playwright test tests/stability.spec.ts --reporter=list', { 
    stdio: 'pipe',
    encoding: 'utf-8' 
  });
  
  console.log(chalk.green.bold('✅ Todos os componentes críticos estão estáveis e renderizando corretamente.'));

} catch (error) {
  const output = error.stdout || error.stderr || '';
  
  console.log(chalk.red.bold('\n🔥 ALERTA DE QUEBRA DE UI ENCONTRADO 🔥\n'));
  console.log(chalk.gray('--- FULL OUTPUT BEGIN ---'));
  console.log(output);
  console.log(chalk.gray('--- FULL OUTPUT END ---\n'));

  console.log(chalk.cyan('\n💡 Sugestão de Debug:'));
  console.log('1. Verifique se o componente possui a prop `key` no AnimatePresence.');
  console.log('2. Verifique se o LocalStorage não disparou um unmount durante a hidratação.\n');
  
  process.exit(1);
}
