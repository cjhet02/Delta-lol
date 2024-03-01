const cheerio = require('cheerio');
const axios = require('axios');
// const fs = require('fs');

// {
//     feature = ''
//     old = []
//     new = []
//     delta = []
// }

async function toNum(text) { //take a string and parse out numerical values/calculate deltas
    text = text.split('(Note:')[0]; //remove any notes, as numbers will match regex
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
        before: diff[0],
        after: diff[1],
        delta,
    }
}



async function getPatch(patch) {
    const url = `http://localhost:3002/patch?patch=${patch}`;
    const data = await fetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    }).catch((err) => {
        console.log(`error on patch ${patch} ${err.response.status}`);
        throw err;
    })
    if(!data) {
        return {};
    }
    // console.log(data.json());
    return data.json();
}

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

function getIndex(list, val, feat) {
    if (!feat) {
        val = val.split(' ')[0];
        for (let i = 0; i < list.length; i++) {
            if (list[i] && list[i].change.split(' ')[0] === val) {
                return i;
            }
        }
    } else {
        for (let i = 0; i < list.length; i++) {
            // console.log(`${list[i].feature} === ${val}`);
            // console.log(i);
            if (list[i] && list[i].feature === val) {
                // console.log(i, list[i].feature)
                return i;
            }
        }
    }
    return -1;
}

async function getDelta(p1, p2) {
    if (!p1 || JSON.stringify(p1) === '{}') {
        return p2;
    } else if (!p2 || JSON.stringify(p2) === '{}') {
        return p1;
    }
    for (let i = 0; i < p2.changeList.length; i++) {
        //if p1.changeList contains p2.changeList[i].change
        // console.log(p1.changeList);
        const cIndex = getIndex(p1.changeList, p2.changeList[i].change, false);
        if (cIndex !== -1) {
            //for j < p2.changeList[i].values
            // console.log(p1.changeList[cIndex].values);
            for (let j = 0; j < p2.changeList[i].values.length; j++) {
                //if p1.changeList[change] contains feature
                // console.log(p2.changeList[i].values);
                const fIndex = getIndex(p1.changeList[cIndex].values, p2.changeList[i].values[j].feature, true);
                // console.log(`fIndex: ${fIndex}`);
                if (fIndex !== -1) {
                    //p1 after = p2 after
                    p1.changeList[cIndex].values[fIndex].after = p2.changeList[i].values[j].after;
                    //p1 delta += p2 delta
                    for (let k = 0; k < p2.changeList[i].values[j].delta.length; k++) {
                        if (!p1.changeList[cIndex].values[fIndex].delta[k])
                            p1.changeList[cIndex].values[fIndex].delta.push('new');
                        else
                            p1.changeList[cIndex].values[fIndex].delta[k] += p2.changeList[i].values[j].delta[k];
                    }
                } else { //else p1.changeList.push feature
                    p1.changeList[cIndex].values.push(p2.changeList[i].values[j]);
                }               
            }
        } else { //else p1.changeList.push change
            p1.changeList.push(p2.changeList[i]);
        }
    }
    return p1;
}
    
//for patch in range [start, end]
    //get patch
    //if patch has champ
//delta = getDelta(delta, patch.champ)
// async function champDelta(champ) {
//     let delta = {};
//     for (let p = 1; p < 5; p++) {
//         const patch = await getPatch(`14-${p}`);
//         for (let c = 0; c < patch.length; c++) {
//             if (patch[c].champ === champ) {
//                 delta = await getDelta(delta, patch[c]);
//             }
//         }
//     }
//     return delta;
// }

export async function champDelta(sSeason, sPatch, eSeason, ePatch, champ) {
    let s = sSeason;
    let p = sPatch;
    let delta = {};
    do {
        //handle edge cases
        if(s === 13 && p === 2)
            p = '1b';
        else if (s === 12 && p === 24) {
            s++;
            p = 1;
        }

        const patch = await getPatch(`${s}-${p}`);
        if(JSON.stringify(patch) === '{}') {
            if(p === 24) {
                p = 1;
                s++;
            } else {
                p++;
            }
            continue;
        }
        for (let c = 0; c < patch.changes.length; c++) {
            if (patch.changes[c].champ === champ) {
                console.log(`${s}-${p}`);
                delta = await getDelta(delta, patch.changes[c]);
                // console.log(delta);
            }
        }

        if(p === 24) {
            p = 1;
            s++;
        } else if (p === '1b') {
            p = 3;
        } else {
            p++;
        }
    } while (s < eSeason || p <= ePatch);

    return delta;
}

export async function parsePatch(patch) {

}

//12.18 AND BEFORE HAVE A DIFFERENT LAYOUT FOR THE CHANGES
//13-2 IS 13-1b CAUSE FUCK YOU
// champDelta(12, 19, 14, 4, 'Zeri').then((res) => {
//     console.log(JSON.stringify(res, null, 2));
//     // fs.writeFile(`patch-delta.json`, JSON.stringify(res, null, 2), 'utf8', () => { });
// });
// let s = 12;
// let p = 19;
// let eSeason = 14;
// let ePatch = 4;
// do {
    //TODO: Change this to get from db        
    // getPatch(`${s}-${p}`).then(async (res) => {
    //     if(JSON.stringify(res) !== '{}') {
    //         const resp = await fetch('http://localhost:3002/patch', {
    //             method: "POST",
    //             headers: {
    //                 "Content-Type": "application/json",
    //             },
    //             body: JSON.stringify(res)
    //         });

    //         console.log(resp.status);
    //     }
    // });
    
//     if(p === 24) {
//         p = 1;
//         s++;
//     } else {
//         p++;
//     }
// } while (s < eSeason || p <= ePatch);

// getDelta(p1, p2).then((res) => {
//     console.log(JSON.stringify(res, null, 2));
// });

// const patch = "14-2";
// getPatch(patch).then(result => {
//     fs.writeFile(`patch-${patch}.json`, JSON.stringify(result, null, 2), 'utf8', () => { });
// }).catch(err => console.log(err));
