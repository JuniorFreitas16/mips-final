module.exports = app => {
    const models = require("../controllers/model.controller.js");
    const plans = require("../controllers/plan.controller.js");

    const router = require("express").Router();

    // Rota para Models
    router.post("/models", models.create);
    router.get("/models", models.findAll);

    // Rota para Inspection Plans
    router.post("/inspection-plans", plans.create);
    router.get("/inspection-plans", plans.findAll);

    app.use("/api", router);
};
