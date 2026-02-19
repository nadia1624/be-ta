const { Periode, PeriodePimpinan } = require('../models');

exports.createPeriode = async (req, res) => {
  try {
    const { nama_periode, tanggal_mulai, tanggal_selesai, keterangan, status_periode } = req.body;
    const periodes = await Periode.findAll({
      attributes: ['id_periode']
    });

    let maxNumber = 0;
    periodes.forEach(p => {
      const match = p.id_periode.match(/^P(\d+)$/);
      if (match) {
        const num = parseInt(match[1]);
        if (num > maxNumber) maxNumber = num;
      }
    });

    const nextNumber = maxNumber + 1;
    const newId = `PD${nextNumber.toString().padStart(3, '0')}`;

    const newPeriode = await Periode.create({
      id_periode: newId,
      nama_periode,
      tanggal_mulai,
      tanggal_selesai,
      keterangan,
      status_periode: status_periode || 'aktif'
    });

    res.status(201).json({
      success: true,
      message: 'Periode berhasil ditambahkan',
      data: newPeriode
    });
  } catch (error) {
    console.error('Error creating periode:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menambahkan periode',
      error: error.message
    });
  }
};

exports.getAllPeriode = async (req, res) => {
  try {
    const periodes = await Periode.findAll({
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: periodes
    });
  } catch (error) {
    console.error('Error fetching periodes:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data periode',
      error: error.message
    });
  }
};

exports.updatePeriode = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_periode, tanggal_mulai, tanggal_selesai, keterangan, status_periode } = req.body;

    const periode = await Periode.findByPk(id);

    if (!periode) {
      return res.status(404).json({
        success: false,
        message: 'Periode tidak ditemukan'
      });
    }

    await periode.update({
      nama_periode,
      tanggal_mulai,
      tanggal_selesai,
      keterangan,
      status_periode
    });

    res.status(200).json({
      success: true,
      message: 'Periode berhasil diupdate',
      data: periode
    });
  } catch (error) {
    console.error('Error updating periode:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengupdate periode',
      error: error.message
    });
  }
};

exports.deletePeriode = async (req, res) => {
  try {
    const { id } = req.params;
    const periode = await Periode.findByPk(id);

    if (!periode) {
      return res.status(404).json({
        success: false,
        message: 'Periode tidak ditemukan'
      });
    }

    await periode.destroy();

    res.status(200).json({
      success: true,
      message: 'Periode berhasil dihapus'
    });
  } catch (error) {
    console.error('Error deleting periode:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus periode',
      error: error.message
    });
  }
};
