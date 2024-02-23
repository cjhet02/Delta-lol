const axios = require('axios');
const cheerio = require('cheerio');const fs = require('fs');

// {
//     feature = ''
//     old = []
//     new = []
//     delta = []
// }

async function toNum(text) { //take a string and parse out numerical values/calculate deltas
    text = text.split('(Note:')[0]; //remove any notes, as numbers will match regex
    let [ feature, changes ] = text.split(': ');
    if(!changes) {
        return null;
    }
    if(feature.search(/^new[^\s]/) != -1){
        feature = feature.slice(3);

        //sometimes the "new" tag will be placed in front of a change, the and accounts for this
        if(changes.indexOf('⇒') == -1) {
            return {
                feature,
                before: ['new'],    
                after: changes,
                delta: ['new'],
            }
        }
    } else if(feature.search(/^removed[^\s]/) != -1){
        return {
            feature: feature.slice(7),
            before: changes,
            after: ['removed'],
            delta: ['removed'],
        }
    } //there has been a change
    // console.log(changes);
    const diff = changes.split('⇒');
    if (diff.length < 2) {
        return {
            feature,
            before: ['new'],
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
        return null; //TODO NOTES SUPPORT HERE TOO
    }
    //lets assume they place new values at the end
    for (let i = 0; i < diffNew.length; i++) {
        if (!diffOld[i])
            delta.push('new');
        else
            delta.push(parseFloat(diffNew[i] - parseFloat(diffOld[i])));
    }

    return {
        feature,
        before: diffOld,
        after: diffNew,
        delta,
    }
}

async function getPatch(patch) {
    const url = `https://www.leagueoflegends.com/en-gb/news/game-updates/patch-${patch}-notes/`;
    try {
        const { data } = await axios.get(url);
    } catch (err) {
        console.log(err);
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
            };
            changeList.push({ change: $(changeElem).text(), values })
            // console.log(changeList[i]);
        }

        if (changeList.length == 0) { //the change is likely for an item, change selects
            const itemChanges = $(elem).find('ul');
            for (let i = 0; i < itemChanges.length; i++) {
                const itemChange = itemChanges[i];
                const values = [];
                const children = $(itemChange).children();

                for (let j = 0; j < children.length; j++) {
                    let text = $(children[j]).text();
                    // console.log(text);
                    values.push(await toNum(text));
                    // console.log(`values: ${values}`);
                }

                changeList.push({ values });
            }
        }

        if(changeList.length == 0) { 
            if(champ) //Defined champ/item name + empty list = new feature
                changeList.push({ change: "Added" });
            else //if both are undefined then just ignore
                continue; //acts as a "continue" in a JQuery each loop
        }

        results.push({ champ, changeList })
    }
    return results;
}

function getIndex(list, val, feat) {
    if (!feat) {
        val = val.split(' ')[0];
        for (let i = 0; i < list.length; i++) {
            if (list[i].change.split(' ')[0] == val) {
                return i;
            }
        }
    } else {
        for (let i = 0; i < list.length; i++) {
            // console.log(`${list[i].change} == ${val}`);
            if (list[i].feature == val) {
                return i;
            }
        }
    }
    return -1;
}

async function getDelta(p1, p2) {
    if (!p1 || JSON.stringify(p1) == '{}') {
        return p2;
    }
    for (let i = 0; i < p2.changeList.length; i++) {
        //if p1.changeList contains p2.changeList[i].change
        // console.log(p1.changeList);
        const cIndex = getIndex(p1.changeList, p2.changeList[i].change, false);
        if (cIndex != -1) {
            //for j < p2.changeList[i].values
            for (let j = 0; j < p2.changeList[i].values.length; j++) {
                //if p1.changeList[change] contains feature
                const fIndex = getIndex(p1.changeList[cIndex].values, p2.changeList[i].values[j].feature, true);
                // console.log(`fIndex: ${fIndex}`);
                if (fIndex != -1) {
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
async function champDelta(champ) {
    let delta = {};
    for (let p = 1; p < 5; p++) {
        const patch = await getPatch(`14-${p}`);
        for (let c = 0; c < patch.length; c++) {
            if (patch[c].champ == champ) {
                delta = await getDelta(delta, patch[c]);
            }
        }
    }
    return delta;
}

champDelta('Illaoi').then((res) => {
    console.log(JSON.stringify(res, null, 2));
});

// getDelta(p1, p2).then((res) => {
//     console.log(JSON.stringify(res, null, 2));
// });

// const patch = "14-2";
// getPatch(patch).then(result => {
//     fs.writeFile(`patch-${patch}.json`, JSON.stringify(result, null, 2), 'utf8', () => { });
// }).catch(err => console.log(err));
