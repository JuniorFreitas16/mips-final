const db = require("../models");
const Model = db.model;

exports.create = (req, res) => {
    const model = {
        plant: req.body.plant,
        part_type: req.body.part_type,
        part_number: req.body.part_number,
        model: req.body.model,
        vendor: req.body.vendor,
        box_qty: req.body.box_qty
    };

    Model.create(model)
        .then(data => {
            res.send(data);
        })
        .catch(err => {
            res.status(500).send({ message: err.message || "Erro ao criar modelo." });
        });
};

exports.findAll = (req, res) => {
    Model.findAll()
        .then(data => res.send(data))
        .catch(err => res.status(500).send({ message: err.message }));
};
