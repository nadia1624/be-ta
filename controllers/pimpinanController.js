const { Pimpinan, PeriodePimpinan, JabatanPimpinan, Periode } = require('../models');

// Helper to generate ID
const generateId = async () => {
    const list = await Pimpinan.findAll({ attributes: ['id_pimpinan'] });
    let max = 0;
    list.forEach(item => {
        const match = item.id_pimpinan.match(/^P(\d+)$/);
        if (match) {
            const num = parseInt(match[1]);
            if (num > max) max = num;
        }
    });
    return `P${(max + 1).toString().padStart(3, '0')}`;
};

exports.getAllPimpinan = async (req, res) => {
  try {
    const data = await PeriodePimpinan.findAll({
      include: [
        { model: Pimpinan, as: 'pimpinan' },
        { model: JabatanPimpinan, as: 'jabatan' },
        { model: Periode, as: 'periode' }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error fetching pimpinan:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createOrUpdatePimpinan = async (req, res) => {
  try {
    const { 
      nama_pimpinan, nip, email, no_hp, 
      id_periode, id_jabatan, status_aktif 
    } = req.body;

    // 1. Find or Create Pimpinan
    let pimpinan = await Pimpinan.findOne({ where: { nip } });
    
    if (!pimpinan) {
      const newId = await generateId();
      pimpinan = await Pimpinan.create({
        id_pimpinan: newId,
        nama_pimpinan,
        nip,
        email,
        no_hp
      });
    } else {
      // Update existing pimpinan info
      await pimpinan.update({ nama_pimpinan, email, no_hp });
    }

    let assignment = await PeriodePimpinan.findOne({
      where: {
        id_pimpinan: pimpinan.id_pimpinan,
        id_periode: id_periode
      }
    });

    if (assignment) {
      await assignment.update({
        id_jabatan,
        status_aktif: status_aktif || 'aktif'
      });
    } else {
      await PeriodePimpinan.create({
        id_pimpinan: pimpinan.id_pimpinan,
        id_periode,
        id_jabatan,
        status_aktif: status_aktif || 'aktif'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Data pimpinan berhasil disimpan',
      data: pimpinan
    });

  } catch (error) {
    console.error('Error saving pimpinan:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deletePimpinan = async (req, res) => {
    try {
        const { id_pimpinan, id_periode } = req.body; // Or params?
        // Usually we delete the assignment (PeriodePimpinan)
        // If we want to delete pimpinan entirely from system, we need to check if they are in other periods
        
        // For this page "Pimpinan Management" which lists assignments:
        // We delete the assignment.
        
        // However, standard REST usually uses ID in URL.
        // But PeriodePimpinan has composite key.
        // Let's assume we pass id_pimpinan and id_periode as query or body, or use a surrogate key if exists.
        // Model definition shows composite PK: id_pimpinan, id_periode.
        
        await PeriodePimpinan.destroy({
            where: {
                id_pimpinan: id_pimpinan,
                id_periode: id_periode
            }
        });
        
        res.status(200).json({ success: true, message: 'Data berhasil dihapus dari periode ini' });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAllJabatan = async (req, res) => {
    try {
        const jabatan = await JabatanPimpinan.findAll();
        res.status(200).json({ success: true, data: jabatan });
    } catch (error) {
        console.error('Error fetching jabatan:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAllPimpinanData = async (req, res) => {
    try {
        const pimpinan = await Pimpinan.findAll({
            order: [['nama_pimpinan', 'ASC']]
        });
        res.status(200).json({ success: true, data: pimpinan });
    } catch (error) {
        console.error('Error fetching pimpinan list:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getActiveAssignments = async (req, res) => {
    try {
        const data = await PeriodePimpinan.findAll({
            where: { status_aktif: 'aktif' },
            include: [
                { model: Pimpinan, as: 'pimpinan' },
                { model: Periode, as: 'periode' },
                { model: JabatanPimpinan, as: 'jabatan' }
            ],
            order: [[{ model: Pimpinan, as: 'pimpinan' }, 'nama_pimpinan', 'ASC']]
        });
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error fetching active assignments:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

