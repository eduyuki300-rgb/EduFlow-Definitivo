import { test, expect } from '@playwright/test';

// Setup inicial: Bypass de Auth e preparação do estado
test.beforeEach(async ({ page, context }) => {
  // Injeta o estado de autenticação e preferências no localStorage antes da navegação
  await context.addInitScript(() => {
    // Injeta o bypass para simular usuário logado (usado no useAuth.ts)
    window.localStorage.setItem('eduflow_qa_bypass', JSON.stringify({ 
      uid: 'qa-user-123', 
      email: 'qa@eduflow.com', 
      displayName: 'QA Engineer' 
    }));
    
    // Garantimos um estado inicial limpo apenas se for a primeira vez
    if (!window.localStorage.getItem('eduflow_edustuffs_open')) {
      window.localStorage.setItem('eduflow_edustuffs_open', 'false');
    }
  });
  
  // Porta do dashboard do EduFlow
  await page.goto('/');
  
  // Debug: Verifica o que está sendo renderizado
  const isDashboard = await page.locator('#nav-bar').isVisible();
  const isLogin = await page.locator('button:has-text("ENTRAR COM GOOGLE")').isVisible();
  
  console.log(`[QA Debug] Pagina carregada. Dashboard: ${isDashboard}, Login: ${isLogin}`);

  // Aguarda o app estabilizar
  await page.waitForSelector('#nav-bar', { state: 'visible', timeout: 10000 });
});

test.describe('EduFlow Core UI Stability', () => {

  test('Interatividade em Cadeia: Planner abre, estabiliza e fecha sem sumir da DOM', async ({ page }) => {
    const toggleBtn = page.locator('#btn-toggle-planner');
    const plannerWindow = page.locator('#planner-window');

    // 1. Validar expansão
    await toggleBtn.click();
    
    // Verifica se a janela apareceu - Aumentamos o timeout para compensar o spring lento
    await expect(plannerWindow).toBeVisible({ timeout: 5000 });
    
    // Verifica se o atributo de acessibilidade foi atualizado
    await expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    
    // Validar se os componentes internos renderizaram (prova de que não é só uma caixa vazia)
    const contentArea = page.locator('#planner-content-area');
    await expect(contentArea).toBeVisible();

    // 2. Validar retração
    await toggleBtn.click();
    
    // No Framer Motion, a saída leva tempo. Usamos toBeHidden para aguardar a animação finalizar.
    await expect(plannerWindow).toBeHidden({ timeout: 2000 }); 
    await expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
  });

  test('Persistência de Estado: Planner sobrevive ao reload preservando estado visual', async ({ page }) => {
    const toggleBtn = page.locator('#btn-toggle-planner');
    const plannerWindow = page.locator('#planner-window');

    // Abre o planner
    await toggleBtn.click();
    await expect(plannerWindow).toBeVisible();

    // Força um reload abrupto
    await page.reload();
    await page.waitForSelector('#nav-bar', { state: 'visible' });

    // Valida se ele já recarrega visível baseado no localStorage, sem cliques extras
    await expect(plannerWindow).toBeVisible({ timeout: 5000 });
    
    // Validação extra: o botão de toggle deve refletir o estado aberto
    await expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
  });

});
