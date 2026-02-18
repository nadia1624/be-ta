'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Users', {
      id_user: {
        type: Sequelize.STRING(10),
        allowNull: false,
        primaryKey: true
      },
      id_role: {
        type: Sequelize.STRING(10),
        allowNull: false,
        references: {
          model: 'Roles',
          key: 'id_role'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      nama: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      nip: {
        type: Sequelize.STRING(30),
        allowNull: true
      },
      email: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      password: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      instansi: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      alamat: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      no_hp: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      status_aktif: {
        type: Sequelize.ENUM('aktif', 'nonaktif'),
        defaultValue: 'aktif'
      },
      foto_profil: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      jabatan: {
        type: Sequelize.STRING(50),
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

    // Add indexes
    await queryInterface.addIndex('Users', ['id_role'], {
      name: 'idx_users_role'
    });
    await queryInterface.addIndex('Users', ['email'], {
      name: 'idx_users_email'
    });
    await queryInterface.addIndex('Users', ['nip'], {
      name: 'idx_users_nip'
    });
    await queryInterface.addIndex('Users', ['status_aktif'], {
      name: 'idx_users_status'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Users');
  }
};
