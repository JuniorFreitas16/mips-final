const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Configuração de conexão com MySQL
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'seu_usuario',
  password: 'sua_senha',
  database: 'panel_inspection_db'
});

// Rotas de API para modelos
app.get('/api/models', (req, res) => {
  connection.query('SELECT * FROM models', (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

app.post('/api/models', (req, res) => {
  const { part_number, model, vendor, box_qty } = req.body;
  const query = 'INSERT INTO models (part_number, model, vendor, box_qty) VALUES (?, ?, ?, ?)';
  
  connection.query(query, [part_number, model, vendor, box_qty], (error, results) => {
    if (error) throw error;
    res.status(201).json({ id: results.insertId });
  });
});

// Rotas para planos de inspeção
app.get('/api/plans', (req, res) => {
  connection.query('SELECT * FROM inspection_plans', (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

app.post('/api/plans', (req, res) => {
  const { po_code, line, part_number, model, plan_qty } = req.body;
  const query = 'INSERT INTO inspection_plans (po_code, line, part_number, model, plan_qty) VALUES (?, ?, ?, ?, ?)';
  
  connection.query(query, [po_code, line, part_number, model, plan_qty], (error, results) => {
    if (error) throw error;
    res.status(201).json({ id: results.insertId });
  });
});

// Rotas para inspeções
app.get('/api/inspections', (req, res) => {
  connection.query('SELECT * FROM inspections', (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

app.post('/api/inspections', (req, res) => {
  const { planId, serial_number, status, defect, part, area } = req.body;
  const query = 'INSERT INTO inspections (plan_id, serial_number, status, defect, part, area) VALUES (?, ?, ?, ?, ?, ?)';
  
  connection.query(query, [planId, serial_number, status, defect, part, area], (error, results) => {
    if (error) throw error;
    res.status(201).json({ id: results.insertId });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});