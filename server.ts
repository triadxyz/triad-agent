// server.ts

import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import path from 'path';

const app = express();

// Configuração do CORS para permitir apenas 'api.triadfi.co'
const corsOptions = {
  origin: 'https://api.triadfi.co',
  methods: ['GET', 'POST'],
};

app.use(cors(corsOptions));

// Defina o endpoint para receber a requisição
app.post('/run-agent', express.json(), (req, res) => {
  const { question, additionalParam } = req.body;

  // Validação básica dos parâmetros
  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }

  // Montar o comando que executa seu arquivo agent.ts com os parâmetros fornecidos
  const command = `npx tsx ${path.join(__dirname, 'agent.ts')} ${question} ${additionalParam || 'default'}`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return res.status(500).json({ error: 'Failed to execute the agent script' });
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return res.status(500).json({ error: 'Error occurred while executing the script' });
    }

    // Enviar a resposta da execução do script
    res.json({ result: stdout });
  });
});

// Defina a porta do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
