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
    console.log(changes);
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

    console.log(diffOld, diffNew);
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
    const { data } = await axios.get(url);
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

        // TODO: REIMPLEMENT ITEM CAPABILITY
        if (changeList.length == 0) { //the change is likely for an item, change selects
            const itemChanges = $(elem).find('ul');
            for (let i = 0; i < itemChanges.length; i++) {
                const itemChange = itemChanges[i];
                const values = [];
                const children = $(itemChange).children();

                for (let j = 0; j < children.length; j++) {
                    let text = $(children[j]).text();
                    console.log(text);
                    values.push(await toNum(text));
                    console.log(`values: ${values}`);
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

const patch = "14-4";
getPatch(patch).then(result => {
    fs.writeFile(`${patch}.json`, JSON.stringify(result, null, 2), 'utf8', () => { });
}).catch(err => console.log(err));
