const axios = require('axios');
const cheerio = require('cheerio');

const BACKEND_URL = 'http://localhost:3002';

//season-patch form (e.g. "14-10")
async function scrapePatch(patch) {
    const url = `https://www.leagueoflegends.com/en-gb/news/game-updates/patch-${patch}-notes/`;
    const { data } = await axios.get(url).catch((err) => {
        if (err.response.status === 404) {
            console.log(`404 on patch ${patch}`);
            return {};
        }
        console.log(`error on patch ${patch} ${err.response.status}`);
        throw err;
    });
    if (!data) {
        return {};
    }

    const $ = cheerio.load(data);
    const results = [];
    const champs = $('div.patch-change-block div');

    for (let index = 0; index < champs.length; index++) {
        const elem = champs[index];
        const changeList = [];
        let changes = $(elem).find('h4.change-detail-title');
        const champ = $(elem).find('h3.change-title').text();

        if (!champ) {
            continue;
        }

        for (let j = 0; j < changes.length; j++) {
            const changeElem = changes[j];
            const values = [];
            const children = $(changeElem).next().children();

            for (let k = 0; k < children.length; k++) {
                let text = $(children[k]).text();
                values.push(await toNum(text));
            }
            changeList.push({ change: $(changeElem).text(), values });
        }

        if (changeList.length === 0) {
            const itemChanges = $(elem).find('ul');
            for (let i = 0; i < itemChanges.length; i++) {
                const itemChange = itemChanges[i];
                const values = [];
                const children = $(itemChange).children();

                for (let j = 0; j < children.length; j++) {
                    let text = $(children[j]).text();
                    await toNum(text).then((res) => {
                        if (res !== null) {
                            values.push(res);
                        }
                    });
                }
                changeList.push({ values });
            }
        }

        if (changeList.length === 0) {
            if (champ)
                changeList.push({ change: 'Added' });
            else
                continue;
        }

        results.push({ champ, changeList });
    }
    return { patch, changes: results };
}

//season-patch form (e.g. "10-16b") - for patches before 12.19
async function scrapeOldPatch(patch) {
    const url = `https://www.leagueoflegends.com/en-gb/news/game-updates/patch-${patch}-notes/`;
    const { data } = await axios.get(url).catch((err) => {
        if (err.response.status === 404) {
            console.log(`404 on patch ${patch}`);
            return {};
        }
        console.log(`error on patch ${patch} ${err.response.status}`);
        throw err;
    });
    if (!data) {
        return {};
    }

    const $ = cheerio.load(data);
    const results = [];
    const champs = $('div.patch-change-block div');

    for (let index = 0; index < champs.length; index++) {
        const elem = champs[index];
        const changeList = [];
        let changes = $(elem).find('h4.change-detail-title');
        const champ = $(elem).find('h3.change-title').text();

        if (!champ) {
            continue;
        }

        for (let j = 0; j < changes.length; j++) {
            const changeElem = changes[j];
            const values = [];
            let next = $(changeElem).next();
            while ($(next).children().length !== 0) {
                const children = $(next).children();
                let text = '';
                for (let k = 0; k < children.length; k++) {
                    if (k === 0) {
                        text = $(children[k]).text() + ':';
                    } else {
                        text = text + ' ' + $(children[k]).text();
                    }
                }
                values.push(await toNum(text));
                next = $(next).next();
            }
            changeList.push({ change: $(changeElem).text(), values });
        }

        if (changeList.length === 0) {
            const itemChanges = $(elem).find('ul');
            for (let i = 0; i < itemChanges.length; i++) {
                const itemChange = itemChanges[i];
                const values = [];
                const children = $(itemChange).children();

                for (let j = 0; j < children.length; j++) {
                    let text = $(children[j]).text();
                    await toNum(text).then((res) => {
                        if (res !== null) {
                            values.push(res);
                        }
                    });
                }
                changeList.push({ values });
            }
        }

        if (changeList.length === 0) {
            if (champ)
                changeList.push({ change: 'Added' });
            else
                continue;
        }

        results.push({ champ, changeList });
    }
    return { patch, changes: results };
}

async function toNum(text) {
    text = text.split('(Note:')[0];
    let [feature, changes] = text.split(': ');
    if (!changes) {
        return { feature, before: 'note', after: 'note', delta: ['note'] };
    }
    if (feature.search(/^new[^\s]/) !== -1) {
        feature = feature.slice(3);
        if (changes.indexOf('⇒') === -1) {
            return { feature, before: 'new', after: changes, delta: ['new'] };
        }
    } else if (feature.search(/^removed[^\s]/) !== -1) {
        return { feature: feature.slice(7), before: changes, after: 'removed', delta: ['removed'] };
    }
    const diff = changes.split('⇒');
    if (diff.length < 2) {
        return { feature, before: 'new', after: changes, delta: ['new'] };
    }
    const diffOld = diff[0].match(/-?\d+(\.\d+)?/g);
    const diffNew = diff[1].match(/-?\d+(\.\d+)?/g);
    const delta = [];

    if (!diffOld || !diffNew) {
        return { feature, before: diff[0], after: diff[1], delta: ['change'] };
    }
    for (let i = 0; i < diffNew.length; i++) {
        if (!diffOld[i])
            delta.push('new');
        else
            delta.push(parseFloat(diffNew[i] - parseFloat(diffOld[i])));
    }

    return { feature, before: [diff[0]], after: [diff[1]], delta };
}

async function postPatch(data) {
    const resp = await fetch(`${BACKEND_URL}/patch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return resp;
}

// --- Run: scrape patch notes for a range of patches ---
// Usage: node scrape.js
//
// Patches use season-patch form with dash separator (e.g. "14-10").
// For season 13 patch 2, use "13-1b". For season 10 patch 16b, use "10-16b".
// Stats are imported separately via: node importStats.js /tmp/lol_stats.json

async function scrapeRange(sSeason, sPatch, eSeason, ePatch) {
    let s = sSeason;
    let p = sPatch;
    do {
        if (s === 13 && p === 2) p = '1b';
        else if (s === 10 && p === 17) p = '16b';
        else if (s === 12 && p === 24) { s++; p = 1; continue; }

        const patchId = `${s}-${p}`;
        process.stdout.write(`${patchId}... `);

        const isOld = s < 12 || (s === 12 && p <= 18);
        const data = isOld
            ? await scrapeOldPatch(patchId)
            : await scrapePatch(patchId);

        if (JSON.stringify(data) !== '{}') {
            const resp = await postPatch(data);
            console.log(`${resp.status} ${resp.statusText}`);
        } else {
            console.log('empty');
        }

        if (p === 24) { p = 1; s++; }
        else if (p === '1b') p = 3;
        else if (p === '16b') p = 18;
        else p++;
    } while (s !== eSeason || p <= ePatch);
}

// Scrape patches 12.1 through 14.10
scrapeRange(12, 1, 14, 10).catch(console.error);
