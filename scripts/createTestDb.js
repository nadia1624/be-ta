const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: 'postgres' // Hubungkan ke default db postgres agar bisa membuat database baru
    });

    try {
        await client.connect();
        const res = await client.query("SELECT 1 FROM pg_database WHERE datname='db_ta_test'");
        if (res.rowCount === 0) {
            console.log("Database 'db_ta_test' belum ada. Membuat database baru...");
            await client.query("CREATE DATABASE db_ta_test;");
            console.log("Database 'db_ta_test' berhasil dibuat!");
        } else {
            console.log("Database 'db_ta_test' sudah ada.");
        }
    } catch (err) {
        console.error("Gagal membuat database pengujian:", err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();
