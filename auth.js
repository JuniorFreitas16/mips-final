const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const router = express.Router();

// Configuração do banco de dados (pode ser movido para um arquivo de configuração separado)
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Middleware de autenticação
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Rota de registro
router.post('/register', async (req, res) => {
  try {
    const { username, password, email, role } = req.body;

    // Validações básicas
    if (!username || !password || !email) {
      return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
    }

    // Verificar se usuário já existe
    const [existingUsers] = await pool.execute(
      'SELECT * FROM users WHERE username = ? OR email = ?', 
      [username, email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ message: 'Usuário ou email já cadastrado' });
    }

    // Criptografar senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Salvar usuário no banco de dados
    const [result] = await pool.execute(
      'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)', 
      [username, hashedPassword, email, role || 'user']
    );

    res.status(201).json({ 
      message: 'Usuário registrado com sucesso', 
      userId: result.insertId 
    });

  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Rota de login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Buscar usuário no banco de dados
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE username = ?', 
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'Usuário não encontrado' });
    }

    const user = users[0];

    // Verificar senha
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Senha incorreta' });
    }

    // Gerar token JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role 
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );

    res.json({ 
      message: 'Login bem-sucedido', 
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Rota para recuperação de senha
router.post('/reset-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Buscar usuário no banco de dados
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE id = ?', 
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    const user = users[0];

    // Verificar senha atual
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isCurrentPasswordValid) {
      return res.status(401).json({ message: 'Senha atual incorreta' });
    }

    // Criptografar nova senha
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Atualizar senha no banco de dados
    await pool.execute(
      'UPDATE users SET password = ? WHERE id = ?', 
      [hashedNewPassword, userId]
    );

    res.json({ message: 'Senha atualizada com sucesso' });

  } catch (error) {
    console.error('Erro na redefinição de senha:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Rota para obter informações do usuário
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Buscar informações do usuário
    const [users] = await pool.execute(
      'SELECT id, username, email, role FROM users WHERE id = ?', 
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    res.json(users[0]);

  } catch (error) {
    console.error('Erro ao buscar informações do usuário:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

module.exports = {
  authRouter: router,
  authenticateToken
};