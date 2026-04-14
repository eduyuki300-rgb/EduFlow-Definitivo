@echo off
setlocal enabledelayedexpansion

echo ########################################
echo #    EduFlow - Sincronizador GitHub    #
echo ########################################
echo.

:: 1. Verificar se há alterações
echo [1/4] Verificando alteracoes locais...
git status -s

:: 2. Solicitar mensagem de commit
echo.
set /p msg="Digite a mensagem do commit (ou aperte Enter para 'Melhorias e estabilizacao'): "
if "!msg!"=="" set msg="Melhorias e estabilizacao"

:: 3. Adicionar e Commitar
echo.
echo [2/4] Preparando arquivos...
git add .

echo [3/4] Criando commit: !msg!
git commit -m "!msg!"

:: 4. Push
echo.
echo [4/4] Enviando para o GitHub...
git push origin main

if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Falha ao sincronizar. Verifique sua conexao ou conflitos.
) else (
    echo.
    echo [SUCESSO] EduFlow atualizado no GitHub com sucesso!
)

echo.
pause
