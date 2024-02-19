const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

// {
//     feature = ''
//     old = []
//     new = []
//     delta = []
// }

async function toNum(text) { //take a string and parse out numerical values/calculate deltas
    // console.log(text);
    text = text.split('(Note:')[0]; //remove any notes, as numbers will match regex
    const [ feature, changes ] = text.split(': ');
    console.log(typeof (changes), text);

    //sometimes the "new" tag will be placed in front of a change, the and accounts for this
    if(changes.search(/^new[^\s]/) && changes.indexOf('⇒') == -1){
        return {
            feature,
            before: ['new'],
            after: changes.slice(3),
            delta: ['new'],
        }
    } else if(changes.search(/^removed[^\s]/)){
        return {
            feature,
            before: changes.slice(7),
            after: ['removed'],
            delta: ['removed'],
        }
    } else { //there has been a change
        const diff = changes.split(" ⇒ ");
        console.log(diff);

        diff[0].match(/-?\d+(\.\d+)?/g)//find old values
        diff[1].match(/-?\d+(\.\d+)?/g)//find new values

        //lets assume they place new values at the end
        for (let i = 0; i < diff[1].length; i++) {
            if (!diff[0][i])
                delta.push('new');
            else
                delta.push(parseFloat(diff[1][i] - parseFloat(diff[0][i])));
        }

        return {
            feature,
            before: diff[0],
            after: diff[1],
            delta,
        }
    }
}

async function getPatch(patch) {
    const url = `https://www.leagueoflegends.com/en-gb/news/game-updates/patch-${patch}-notes/`;
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const results = [];
    const champs = $('div.patch-change-block div');

    champs.each((index, elem) => {
        const changeList = [];
        let changes = $(elem).find('h4.change-detail-title');
        const champ = $(elem).find('h3.change-title').text();

        changes.each((index, elem) => {
            const values = $(elem).next().children().toArray().map(async function(x) {
                let text = $(x).text();

                return await toNum(text);
            });

            changeList.push({ change: $(elem).text(), values })
        })

        if (changeList.length == 0) { //the change is likely for an item, change selects
            changes = $(elem).find('ul');
            changes.each((index, elem) => {
                const values = $(elem).children().toArray().map(async function(x) {
                    let text = $(x).text();
                    return await toNum(text);
                });

                changeList.push({ values })
            })
        }

        if(changeList.length == 0) { 
            if(champ) //Defined champ/item name + empty list = new feature
                changeList.push({ change: "Added" });
            else //if both are undefined then just ignore
                return true; //acts as a "continue" in a JQuery each loop
        }

        results.push({ champ, changeList })
    })
    return results;
}

// async function getDelta(startPatch, endPatch) {
//     for()
// }

const patch = "14-2";
getPatch(patch).then(result => {
    // console.log(result);
    fs.writeFile(`${patch}.json`, JSON.stringify(result, null, 2), 'utf8', () => { });
}).catch(err => console.log(err));
