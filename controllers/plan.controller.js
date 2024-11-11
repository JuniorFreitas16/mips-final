const db = require("../models");
const InspectionPlan = db.inspectionPlan;

exports.create = (req, res) => {
    const plan = {
        plan_date: req.body.plan_date,
        po_code: req.body.po_code,
        line: req.body.line,
        part_number: req.body.part_number,
        model: req.body.model,
        vendor: req.body.vendor,
        plan_qty: req.body.plan_qty,
        part_type: req.body.part_type,
        box_qty: req.body.box_qty,
        remark: req.body.remark
        
    };

    InspectionPlan.create(plan)
        .then(data => res.send(data))
        .catch(err => res.status(500).send({ message: err.message || "Erro ao criar plano de inspeção." }));
};

exports.findAll = (req, res) => {
    InspectionPlan.findAll()
        .then(data => res.send(data))
        .catch(err => res.status(500).send({ message: err.message }));
};
