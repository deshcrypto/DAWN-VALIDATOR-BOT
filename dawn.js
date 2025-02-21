const fs = require('fs');
const chalk = require('chalk');
const fetch = require('node-fetch');

const API_GET_POINT = 'https://www.aeropres.in/api/atom/v1/userreferral/getpoint';
const API_KEEP_ALIVE = 'https://www.aeropres.in/chromeapi/dawn/v1/userreward/keepalive';
const MAX_RETRIES = 3;
const DELAY_BETWEEN_ACCOUNTS = 3000;
const DELAY_BETWEEN_LOOPS = 60000;

// Fungsi mencetak header yang tetap di atas
function printHeader() {
    console.clear();
    console.log(chalk.blueBright('=========================================='));
    console.log(chalk.greenBright('   AUTO RUN 24 HOURS DAWN VALIDATOR'));
    console.log(chalk.yellowBright('         BOT By SAYA LURUS'));
    console.log(chalk.blueBright('=========================================='));
}

// Fungsi membaca token dari file
function getTokens() {
    return fs.existsSync('tokens.txt')
        ? fs.readFileSync('tokens.txt', 'utf-8')
            .split(/\r?\n/)
            .map(token => token.trim())
            .filter(Boolean)
        : [];
}

// Fungsi untuk retry dengan batas percobaan
async function fetchWithRetry(url, token) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            if (response.ok) {
                return await response.json(); // Hentikan loop jika sukses
            }
        } catch (error) {
            // Abaikan kesalahan karena akan retry
        }
        await new Promise(resolve => setTimeout(resolve, 2000)); // Jeda sebelum retry
    }
    return null;
}

// Fungsi mengambil data poin
async function getPoint(token, appid) {
    if (!appid) return null;
    const url = `${API_GET_POINT}?appid=${appid}`;
    return await fetchWithRetry(url, token);
}

// Fungsi keep-alive
async function keepAlive(token, appid) {
    if (!appid) return 'N/A';
    const url = `${API_KEEP_ALIVE}?appid=${appid}`;
    return await fetchWithRetry(url, token) ? '? OK' : '? Failed';
}

// Fungsi utama bot
async function startBot() {
    printHeader();
    console.log(chalk.cyan('[AUTO RUN] Bot is starting...'));

    const tokens = getTokens();
    if (tokens.length === 0) {
        console.error(chalk.red('[ERROR] Tidak ada token dalam file tokens.txt!'));
        return;
    }

    while (true) {
        printHeader(); // Pastikan header tetap di atas
        console.log(chalk.yellow(`\n[AUTO RUN] Memproses ${tokens.length} akun...`));

        for (let i = 0; i < tokens.length; i++) {
            console.log(chalk.gray(`[INFO] Processing token ${i + 1}/${tokens.length}...`));
            console.log(chalk.gray('[INFO] Memuat data . . .'));
            
            const appid = 'VALID_APPID';
            if (!appid) {
                console.error(chalk.red(`[ERROR] AppID tidak valid untuk token ${i + 1}`));
                continue;
            }
            
            const pointData = await getPoint(tokens[i], appid);
            if (!pointData) continue; // Jika gagal login, lanjut ke akun berikutnya
            
            const { email, commission } = pointData.data.referralPoint;
            const reward = pointData.data.rewardPoint;
            const totalPoints = reward.points + reward.twitter_x_id_points + reward.discordid_points + reward.telegramid_points;
            const keepAliveStatus = await keepAlive(tokens[i], appid);
            console.log(chalk.green(
                `[AUTO RUN] Akun: ${email}, Points: ${totalPoints.toFixed(2)} (Referral: ${commission}), Keep Alive: ${keepAliveStatus}`
            ));
            console.log(chalk.blue(`[INFO] Data akun berhasil dimuat: ${email}`));
            await new Promise(resolve => setTimeout(resolve, 1000)); // Timer sampah 1 detik sebelum lanjut
            
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_ACCOUNTS)); // Jeda 3 detik per akun
        }

        console.log(chalk.magenta('[AUTO RUN] Menunggu 60 detik sebelum loop berikutnya...'));
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_LOOPS));
    }
}

// Mulai bot
startBot();
