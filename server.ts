import express, { Request, Response } from 'express';
import { exec } from 'child_process';

const app = express();
const port = 3000;

// Middleware para permitir JSON no corpo da requisição
app.use(express.json());

app.get('/execute', (req: Request, res: Response) => {
  const { arg1, arg2 } = req.query;

  // Validação dos parâmetros
  if (!arg1 || !arg2) {
    return res.status(400).json({ error: 'Args necessarys' });
  }

  // Comando para rodar o script TypeScript
  const command = `npx tsx agent.ts ${arg1} ${arg2}`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: stderr || 'Error' });
    }
    res.json({ output: stdout.trim() });
  });
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`server running http://localhost:${port}`);
});
