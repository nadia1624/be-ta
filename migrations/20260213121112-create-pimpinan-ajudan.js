'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('PimpinanAjudans', {
      id_jabatan: {
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

    // Composite FK: (id_jabatan, id_periode) -> PeriodeJabatans
    await queryInterface.addConstraint('PimpinanAjudans', {
      fields: ['id_jabatan', 'id_periode'],
      type: 'foreign key',
      name: 'fk_pimpinan_ajudan_periode',
      references: {
        table: 'PeriodeJabatans',
        fields: ['id_jabatan', 'id_periode']
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
