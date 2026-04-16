import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Middleware to parse JSON bodies
  app.use(express.json({ limit: '50mb' }));

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Gemini AI Route
  app.post("/api/gemini", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      
      // Validação básica do cabeçalho
      if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.length < 10) {
        return res.status(401).json({ error: "Não autorizado. Cabeçalho de autenticação ausente ou inválido." });
      }

      const idToken = authHeader.split('Bearer ')[1];
      const fbApiKey = process.env.VITE_FIREBASE_API_KEY;

      if (!fbApiKey) {
        console.error("ERRO: VITE_FIREBASE_API_KEY não configurada no servidor.");
        return res.status(500).json({ error: "Configuração do servidor incompleta (API Key do Firebase)." });
      }

      // Verifica o token usando a API do Google Identity (Firebase Auth)
      const verifyResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${fbApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      }).catch(err => {
        console.error("Erro ao conectar com Google Identity API:", err);
        return null;
      });

      if (!verifyResponse || !verifyResponse.ok) {
        const errorText = verifyResponse ? await verifyResponse.text() : "Conexão falhou";
        console.warn("Falha na verificação do token:", errorText);
        return res.status(403).json({ error: "Sessão inválida ou expirada. Por favor, faça login novamente." });
      }

      const { contents } = req.body;
      
      // Tenta usar a chave customizada primeiro, depois a padrão
      const apiKey = process.env.CHAVE_CUSTOMIZADA || process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "A chave da API não está configurada no servidor." });
      }

      const ai = new GoogleGenAI({ apiKey: apiKey });
      
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: contents,
        config: {
          responseMimeType: "application/json",
        }
      });

      const text = response.text;
      if (!text) throw new Error("Resposta vazia da IA");
      
      res.json({ text });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      
      // Handle specific API key errors
      if (error.message && error.message.includes("API key not valid")) {
        return res.status(400).json({ 
          error: "A chave da API do Gemini é inválida. Por favor, verifique se você configurou a chave correta no painel de Secrets (Configurações) do AI Studio." 
        });
      }
      
      res.status(500).json({ error: error.message || "Failed to process AI request" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
