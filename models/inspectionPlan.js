module.exports = (sequelize, DataTypes) => {
    const InspectionPlan = sequelize.define("inspection_plan", {
        plan_date: {
            type: DataTypes.DATE,
            allowNull: false
        },
        po_code: {
            type: DataTypes.STRING,
            allowNull: false
        },
        line: {
            type: DataTypes.STRING,
            allowNull: false
        },
        part_number: {
            type: DataTypes.STRING,
            allowNull: false
        },
        model: {
            type: DataTypes.STRING,
            allowNull: false
        },
        vendor: {
            type: DataTypes.STRING,
            allowNull: false
        },
        plan_qty: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        part_type: {
            type: DataTypes.STRING,
            allowNull: false
        },
        box_qty: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        remark: {
            type: DataTypes.TEXT
        }

    });

    return InspectionPlan;
};
