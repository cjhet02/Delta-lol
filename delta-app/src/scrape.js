const axios = require('axios');
const cheerio = require('cheerio');

async function toNum(text) { //take a string and parse out numerical values/calculate deltas
    text = text.split('(Note:')[0]; //remove any notes, as numbers will match regex
    // console.log(text);
    let [ feature, changes ] = text.split(': ');
    // console.log(feature, changes);
    if(!changes) {
        return { //TODO: notes support
            feature,
            before: 'note',    
            after: 'note',
            delta: ['note'],
        };
    }
    if(feature.search(/^new[^\s]/) !== -1){
        feature = feature.slice(3);

        //sometimes the "new" tag will be placed in front of a change, the and accounts for this
        if(changes.indexOf('⇒') === -1) {
            return {
                feature,
                before: 'new',    
                after: changes,
                delta: ['new'],
            }
        }
    } else if(feature.search(/^removed[^\s]/) !== -1){
        return {
            feature: feature.slice(7),
            before: changes,
            after: 'removed',
            delta: ['removed'],
        }
    } //there has been a change
    // console.log(changes);
    const diff = changes.split('⇒');
    if (diff.length < 2) {
        return {
            feature,
            before: 'new',
            after: changes,
            delta: ['new'],
        }
    }
    // console.log(diff);
    const diffOld = diff[0].match(/-?\d+(\.\d+)?/g)//find old values
    const diffNew = diff[1].match(/-?\d+(\.\d+)?/g)//find new values
    const delta = [];

    // console.log(diffOld, diffNew);
    if(!diffOld || !diffNew) {
        // console.log(`returning null ${text}`);
        return { //TODO: notes support
            feature,
            before: diff[0],    
            after: diff[1],
            delta: ['change'],
        };
    }
    //lets assume they place new values at the end
    for (let i = 0; i < diffNew.length; i++) {
        if (!diffOld[i])
            delta.push('new');
        else
            delta.push(parseFloat(diffNew[i] - parseFloat(diffOld[i]))); //TODO round to 3 dec points?
    }

    // console.log(delta);
    return {
        feature,
        before: [diff[0]],
        after: [diff[1]],
        delta,
    }
}

//in season-patch form
async function scrapePatch(patch){
    const url = `https://www.leagueoflegends.com/en-gb/news/game-updates/patch-${patch}-notes/`;
    const { data } = await axios.get(url).catch((err) => {
        if (err.response.status === 404) {
            console.log(`404 on patch ${patch}`);
            return {};
        }
        console.log(`error on patch ${patch} ${err.response.status}`);
        throw err;
    })
    if(!data) {
        return {};
    }

    const $ = cheerio.load(data);

    const results = [];
    const champs = $('div.patch-change-block div');

    // await champs.each(async (i, elem) => {
    for (let index = 0; index < champs.length; index++) {
        const elem = champs[index]
        const changeList = [];
        let changes = $(elem).find('h4.change-detail-title');
        const champ = $(elem).find('h3.change-title').text();
        // console.log(`champ: ${champ} - changes: ${changes}`);'
        if(!champ) { //TODO NOTES SUPPORT (non-champ/item)
            continue;
        }

        // await changes.each(async (i, elem) => {
        for (let j = 0; j < changes.length; j++) {
            const changeElem = changes[j];
            const values = [];
            const children = $(changeElem).next().children();

            // const values = await $(elem).next().children().toArray().map(async function(x) {
            for (let k = 0; k < children.length; k++) {
                let text = $(children[k]).text();
                values.push(await toNum(text));
                // console.log(values);
            };
            changeList.push({ change: $(changeElem).text(), values })
            // console.log(changeList[i]);
        }

        if (changeList.length === 0) { //the change is likely for an item, change selects
            const itemChanges = $(elem).find('ul');
            for (let i = 0; i < itemChanges.length; i++) {
                const itemChange = itemChanges[i];
                const values = [];
                const children = $(itemChange).children();

                for (let j = 0; j < children.length; j++) {
                    let text = $(children[j]).text();
                    // console.log(text);
                    // values.push(await toNum(text));
                    await toNum(text).then((res) => {
                        if(res !== null) {
                            values.push(res);
                        }
                        // } else {
                        //     console.log(`didn't push ${text}`);
                        // }
                    })
                    // console.log(`values: ${values}`);
                }

                changeList.push({ values });
            }
        }

        if(changeList.length === 0) { 
            if(champ) //Defined champ/item name + empty list = new feature
                changeList.push({ change: "Added" });
            else //if both are undefined then just ignore
                continue; //acts as a "continue" in a JQuery each loop
        }

        results.push({ champ, changeList })
    }
    // console.log(JSON.stringify({patch, changes: results}, null, 2));
    return {patch, changes: results};
}

async function scrapeOldPatch(patch){
    const url = `https://www.leagueoflegends.com/en-gb/news/game-updates/patch-${patch}-notes/`;
    const { data } = await axios.get(url).catch((err) => {
        if (err.response.status === 404) {
            console.log(`404 on patch ${patch}`);
            return {};
        }
        console.log(`error on patch ${patch} ${err.response.status}`);
        throw err;
    })
    if(!data) {
        return {};
    }

    const $ = cheerio.load(data);

    const results = [];
    const champs = $('div.patch-change-block div');

    // await champs.each(async (i, elem) => {
    for (let index = 0; index < champs.length; index++) {
        const elem = champs[index]
        const changeList = [];
        let changes = $(elem).find('h4.change-detail-title');
        const champ = $(elem).find('h3.change-title').text();
        // console.log(`champ: ${champ} - changes: ${changes}`);'
        if(!champ) { //TODO NOTES SUPPORT (non-champ/item)
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
                };
                values.push(await toNum(text));
                next = $(next).next();
            }

            changeList.push({ change: $(changeElem).text(), values })
        }

        if (changeList.length === 0) { //the change is likely for an item, change selects
            const itemChanges = $(elem).find('ul');
            for (let i = 0; i < itemChanges.length; i++) {
                const itemChange = itemChanges[i];
                const values = [];
                const children = $(itemChange).children();

                for (let j = 0; j < children.length; j++) {
                    let text = $(children[j]).text();
                    // console.log(text);
                    // values.push(await toNum(text));
                    await toNum(text).then((res) => {
                        if(res !== null) {
                            values.push(res);
                        }
                        // } else {
                        //     console.log(`didn't push ${text}`);
                        // }
                    })
                    // console.log(`values: ${values}`);
                }

                changeList.push({ values });
            }
        }

        if(changeList.length === 0) { 
            if(champ) //Defined champ/item name + empty list = new feature
                changeList.push({ change: "Added" });
            else //if both are undefined then just ignore
                continue; //acts as a "continue" in a JQuery each loop
        }

        results.push({ champ, changeList })
    }
    // console.log(JSON.stringify({patch, changes: results}, null, 2));
    return {patch, changes: results};
}

//in season.patch form
async function scrapeStats(patch){
    const url = `https://www.metasrc.com/lol/${patch}/stats`;
    const { data } = await axios.get(url).catch((err) => {
        if (err.response.status === 404) {
            console.log(`404 on patch ${patch}`);
            return {};
        }
        console.log(`error on patch ${patch} ${err.response.status}`);
        throw err;
    })
    if (!data) {
        console.log("no data");
        return {};
    }
    const names = ['Name', 'Role', 'Tier', 'Score', 'Trend', 'Win', 'Role_P', 'Pick', 'Ban', 'KDA']

    const $ = cheerio.load(data);
    let results = [];
    $('table tr').each((index, e) => {
        let row = {};
        const cells = $(e).find('td');
        cells.each((cIndex, cE) => {
            if (cIndex === 0) {
                const name = $(cE).find('span');
                row[names[cIndex]] = name.text();
            } else {
                if (cIndex > 4 && cIndex < 9)
                    row[names[cIndex]] = $(cE).text().slice(0, -1);
                else if ($(cE).text() === '999NEW')
                    row[names[cIndex]] = 0;
                else
                    row[names[cIndex]] = $(cE).text();
            }
        })
        row['Class'] = 'NA';
        results.push(row);
    })
    return {patch, champs: results};
}

//12.18 AND BEFORE HAVE A DIFFERENT LAYOUT FOR THE CHANGES
// let s = 12;
// let p = 1;
// do {
    // scrapeOldPatch('10-16b').then(async (res) => {
    //     // console.log(JSON.stringify(res, null, 2));
    //     if (JSON.stringify(res) !== '{}') {
    //         const resp = await fetch('http://localhost:3002/patch', {
    //             method: "POST",
    //             headers: {
    //                 "Content-Type": "application/json",
    //             },
    //             body: JSON.stringify(res)
    //         });
    //         console.log(`${res.patch}: ${resp.statusText}`);
    //     }
    // });
//     if (p === 1) {
//         p = 25;
//         s--;
//     } else {
//         p--;
//     }
// } while (s !== 1 || p !== 1)

//13-2 IS 13-1b CAUSE FUCK YOU
// champDelta(12, 19, 14, 4, 'Zeri').then((res) => {
//     console.log(JSON.stringify(res, null, 2));
//     // fs.writeFile(`patch-delta.json`, JSON.stringify(res, null, 2), 'utf8', () => { });
// });
// let s = 14;
// let p = 8;
// let eSeason = 14;
// let ePatch = 9;
// do {
//     scrapePatch(`${s}-${p}`).then(async (res) => {
//         if(JSON.stringify(res) !== '{}') {
//             const resp = await fetch('http://localhost:3002/patch', {
//                 method: "POST",
//                 headers: {
//                     "Content-Type": "application/json",
//                 },
//                 body: JSON.stringify(res)
//             });

//             console.log(resp.status);
//         }
// });
// const patches = ['11.24', '10.25', '9.24', '8.24', '7.24', '6.24'];

// for (let i = 0; i < patches.length; i++) {
    // scrapeStats(`${s}.${p}`).then(async (res) => {
    //     console.log(res.patch, res.champs[1])
    //     if (JSON.stringify(res) !== '{}') {
    //         const resp = await fetch('http://localhost:3002/stats', {
    //             method: "POST",
    //             headers: {
    //                 "Content-Type": "application/json",
    //             },
    //             body: JSON.stringify(res)
    //         });
    //         console.log(resp.status);
    //     }
    // });
// }
    
//     if(p === 24) {
//         p = 1;
//         s++;
//     } else {
//         p++;
//     }
// } while (s < eSeason || p <= ePatch);

    // scrapeStats(`13.10`).then(async (res) => {
    //     if(JSON.stringify(res) !== '{}') {
    //         const resp = await fetch('http://localhost:3002/stats', {
    //             method: "POST",
    //             headers: {
    //                 "Content-Type": "application/json",
    //             },
    //             body: JSON.stringify(res)
    //         });

    //         console.log(resp.status);
    //     }
    // });