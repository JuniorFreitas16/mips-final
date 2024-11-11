// API para buscar dados do modelo com base no Part Number no MySQL
app.get('/api/get-model-data', async (req, res) => {
  const partNumber = req.query.part_number;

  try {
    const model = await Models.findOne({ where: { part_number: partNumber } });
    if (model) {
      res.json(model);
    } else {
      res.status(404).json({ message: 'Part number not found' });
    }
  } catch (error) {
    console.error('Error fetching model data from MySQL:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});