require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({limit: '50mb'}));
app.use(express.static(path.join(__dirname, 'public')));

// Configuração do Banco de Dados
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',  // Usuário padrão do XAMPP
  password: '',  // Senha padrão em branco
  database: 'panel_inspection_db'
});

connection.connect((err) => {
  if (err) {
    console.error('Erro de conexão com o banco:', err);
    return;
  }
  console.log('Conectado ao MySQL');
});

// Rotas de API de exemplo
app.get('/api/models', (req, res) => {
  connection.query('SELECT * FROM models', (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});