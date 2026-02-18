'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('PimpinanAjudans', {
      id_pimpinan: {
        type: Sequelize.STRING(10),
        allowNull: false,
        primaryKey: true
      },
      id_periode: {
        type: Sequelize.STRING(10),
        allowNull: false,
        primaryKey: true
      },
      id_user_ajudan: {
        type: Sequelize.STRING(10),
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'Users',
          key: 'id_user'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      keterangan: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Composite FK: (id_pimpinan, id_periode) -> PeriodePimpinans
    await queryInterface.addConstraint('PimpinanAjudans', {
      fields: ['id_pimpinan', 'id_periode'],
      type: 'foreign key',
      name: 'fk_pimpinan_ajudan_periode',
      references: {
        table: 'PeriodePimpinans',
        fields: ['id_pimpinan', 'id_periode']
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    // Indexes
    await queryInterface.addIndex('PimpinanAjudans', ['id_user_ajudan'], {
      name: 'idx_pimpinan_ajudans_ajudan'
    });
    await queryInterface.addIndex('PimpinanAjudans', ['id_periode'], {
      name: 'idx_pimpinan_ajudans_periode'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('PimpinanAjudans');
  }
};
