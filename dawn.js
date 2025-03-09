const fs = require('fs');
const chalk = require('chalk');
const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');

const API_GET_POINT = 'https://www.aeropres.in/api/atom/v1/userreferral/getpoint';
const API_KEEP_ALIVE = 'https://www.aeropres.in/chromeapi/dawn/v1/userreward/keepalive';
const MAX_RETRIES = 3;
const DELAY_BETWEEN_ACCOUNTS = 4000;
const DELAY_BETWEEN_LOOPS = 60000;

function printHeader() {
    console.clear();
    console.log(chalk.blueBright('=========================================='));
    console.log(chalk.greenBright('   AUTO RUN 24 HOURS DAWN VALIDATOR'));
    console.log(chalk.yellowBright('        POWERED BY SAYA LURUS'));
    console.log(chalk.blueBright('=========================================='));
}

function getHeaders(token = null) {
    const headers = {
        'accept': '*/*',
        'accept-language': 'en-US,en;q=0.9',
        'origin': 'chrome-extension://fpdkjdnhkakefebpekbdhillbhonfjjp',
        'priority': 'u=1, i',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'cross-site',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
}

function getTokens() {
    return fs.existsSync('tokens.txt')
        ? fs.readFileSync('tokens.txt', 'utf-8')
            .split(/\r?\n/)
            .map(token => token.trim())
            .filter(Boolean)
        : [];
}

function getProxies() {
    return fs.existsSync('proxy.txt')
        ? fs.readFileSync('proxy.txt', 'utf-8')
            .split(/\r?\n/)
            .map(proxy => proxy.trim())
            .filter(Boolean)
        : [];
}

async function fetchWithRetry(url, options, proxy) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            if (proxy !== 'Direct Connection') {
                options.agent = new HttpsProxyAgent(proxy);
            }
            const response = await fetch(url, options);
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error(chalk.red(`[ERROR] Fetch gagal (Percobaan ${attempt}): ${error.message}`));
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    return null;
}

async function getPoint(token, appid, proxy) {
    if (!appid) return null;
    const url = `${API_GET_POINT}?appid=${appid}`;
    return await fetchWithRetry(url, { headers: getHeaders(token) }, proxy);
}

async function keepAlive(token, appid, proxy) {
    if (!appid) return 'N/A';
    const url = `${API_KEEP_ALIVE}?appid=${appid}`;
    const response = await fetchWithRetry(url, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({})
    }, proxy);
    return response && response.success ? '? OK' : '? Failed';
}

async function startBot() {
    printHeader();
    console.log(chalk.cyan('[AUTO RUN] Bot is starting...'));

    const tokens = getTokens();
    const proxies = getProxies();

    console.log(chalk.yellow(`[INFO] Total Akun: ${tokens.length}, Total Proxy: ${proxies.length}`));
    
    if (tokens.length === 0) {
        console.error(chalk.red('[ERROR] Tidak ada token dalam file tokens.txt!'));
        return;
    }

    while (true) {
        printHeader();
        console.log(chalk.yellow(`\n[AUTO RUN] Memproses ${tokens.length} akun dengan ${proxies.length} proxy...`));

        for (let i = 0; i < tokens.length; i++) {
            const proxy = proxies.length > 0 ? proxies[i % proxies.length] : 'Direct Connection';
            console.log(chalk.gray(`[INFO] Processing token ${i + 1}/${tokens.length}...`));
            console.log(chalk.gray(`[INFO] Menggunakan Proxy: ${proxy}`));
            console.log(chalk.gray('[INFO] Memuat data . . .'));
            
            const appid = 'VALID_APPID';
            if (!appid) {
                console.error(chalk.red(`[ERROR] AppID tidak valid untuk token ${i + 1}`));
                continue;
            }
            
            const pointData = await getPoint(tokens[i], appid, proxy);
            if (!pointData) continue;
            
            const { email, commission } = pointData.data.referralPoint;
            const reward = pointData.data.rewardPoint;
            const totalPoints = reward.points + reward.twitter_x_id_points + reward.discordid_points + reward.telegramid_points;
            const keepAliveStatus = await keepAlive(tokens[i], appid, proxy);
            console.log(chalk.green(
                `[AUTO RUN] Akun: ${email}, Points: ${totalPoints.toFixed(2)} (Referral: ${commission}), Keep Alive: ${keepAliveStatus}`
            ));
            console.log(chalk.blue(`[INFO] Data akun berhasil dimuat: ${email}`));
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_ACCOUNTS));
        }

        console.log(chalk.magenta('[AUTO RUN] Menunggu 60 detik sebelum loop berikutnya...'));
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_LOOPS));
    }
}

startBot();
