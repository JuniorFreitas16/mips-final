module.exports = (sequelize, DataTypes) => {
    const Model = sequelize.define("model", {
        plant: {
            type: DataTypes.STRING,
            allowNull: false
        },
        part_type: {
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
        box_qty: {
            type: DataTypes.INTEGER,
            allowNull: false
        }
    });

    return Model;
};
