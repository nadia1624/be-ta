const { Pimpinan, PeriodeJabatan, JabatanPimpinan, Periode } = require('../models');

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
    const data = await PeriodeJabatan.findAll({
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

    // Check existing assignment by id_jabatan and id_periode? 
    // Wait, PK of PeriodeJabatan is id_jabatan + id_periode? 
    // Migration 642 says: id_jabatan is PK.
    // Migration 651 (Model): id_jabatan (PK), id_periode (PK).
    // So we search by id_jabatan and id_periode.
    // BUT we are assigning a PIMPINAN to a JABATAN in a PERIODE.
    // So distinct is id_jabatan + id_periode. Pimpinan is generic FK? 
    // Migration 652: id_pimpinan is just a FK.
    
    // So if we are "Creating Pimpinan Assignment", we are actually Creating/Updating a PeriodeJabatan record.
    // We strictly need id_jabatan and id_periode.
    
    let assignment = await PeriodeJabatan.findOne({
      where: {
        id_jabatan: id_jabatan,
        id_periode: id_periode
      }
    });

    if (assignment) {
      await assignment.update({
        id_pimpinan: pimpinan.id_pimpinan, // Assign this pimpinan to the position
        status_aktif: status_aktif || 'aktif'
      });
    } else {
      await PeriodeJabatan.create({
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
        const { id_jabatan, id_periode } = req.body; 
        
        await PeriodeJabatan.destroy({
            where: {
                id_jabatan: id_jabatan,
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
        const data = await PeriodeJabatan.findAll({
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

