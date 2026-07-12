const fs = require('fs');
const path = require('path');

const BACKEND_URL = 'http://localhost:3002';
const DATA_FILE = process.argv[2] || '/tmp/lol_stats.json';

async function importPatch(patch, data) {
    const resp = await fetch(`${BACKEND_URL}/stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!resp.ok) {
        console.error(`  Failed ${patch}: ${resp.status} ${await resp.text()}`);
        return false;
    }
    return true;
}

async function main() {
    if (!fs.existsSync(DATA_FILE)) {
        console.error(`Data file not found: ${DATA_FILE}`);
        console.error('Run: python3 scripts/seed_stats.py first to generate it');
        process.exit(1);
    }

    const allData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const patches = Object.keys(allData).sort((a, b) => {
        const toNums = s => s.split('.').map(p => p.startsWith('S') ? 3 + parseInt(p.slice(1)) * 0.01 : parseInt(p));
        const pa = toNums(a), pb = toNums(b);
        for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
            const d = (pa[i] || 0) - (pb[i] || 0);
            if (d !== 0) return d;
        }
        return 0;
    });

    console.log(`Importing ${patches.length} patches from ${DATA_FILE}\n`);

    let success = 0;
    let failed = 0;

    for (const patch of patches) {
        const data = allData[patch];
        const count = data.champs.length;
        process.stdout.write(`${patch} (${count} champs)... `);
        const ok = await importPatch(patch, data);
        if (ok) {
            console.log('ok');
            success++;
        } else {
            failed++;
        }
        // Rate limit: stay under 5 req/min (one every 12s to be safe)
        await new Promise(r => setTimeout(r, 200));
    }

    console.log(`\nDone: ${success} succeeded, ${failed} failed`);
}

main().catch(console.error);
