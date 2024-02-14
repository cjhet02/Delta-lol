const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

// {
//     feature = ''
//     old = []
//     new = []
//     delta = []
// }

function toNum(text) {
    const arr = text.split(": ");
    
    if(!text.search(/^new[^\s]/)){
        text = 'New: ' + text.slice(3);
        //add to new array
        //add 'new' to old array
    } else if(!text.search(/^removed[^\s]/)){
        text = 'Removed: ' + text.slice(7);
        //add to old array
        //add 'removed' to new array
    }

    if(text.indexOf('⇒') == -1) { //no arrow for changes
        //assume new:
        //add to new array
        //add 'new' to old array
    } else {
        if(arr[0] == null) {
            return text.split(" ⇒ ")[1];
        } else {
            if(!arr[0].search(/^new[^\s]/)){ //clean up "new" tag
                console.log(`${arr[0]} -> ${arr[0].slice(3)}`);
                arr[0] = arr[0].slice(3);
            }
            return arr[0] + ': ' + text.split(" ⇒ ")[1];
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
            const values = $(elem).next().children().toArray().map(function(x) {
                let text = $(x).text();
                if(!text.search(/^new[^\s]/)){ //clean up "new" tag
                    text = text.slice(3);
                } else if(!text.search(/^removed[^\s]/)){ //clean up "new" tag
                    text = text.slice(7);
                }

                console.log(text);
                if(text.indexOf('⇒') == -1) {
                    return text;
                } else {
                    const arr = text.split(": ");
                    if(arr[0] == null) {
                        return text.split(" ⇒ ")[1];
                    } else {
                        if(!arr[0].search(/^new[^\s]/)){ //clean up "new" tag
                            console.log(`${arr[0]} -> ${arr[0].slice(3)}`);
                            arr[0] = arr[0].slice(3);
                        }
                        return arr[0] + ': ' + text.split(" ⇒ ")[1];
                    }
                }
            });

            changeList.push({ change: $(elem).text(), values })
        })

        if (changeList.length == 0) { //the change is likely for an item, change selects
            changes = $(elem).find('ul');
            changes.each((index, elem) => {
                const values = $(elem).children().toArray().map(function(x) {
                    let text = $(x).text();
                    if(!text.search(/^new[^\s]/)){ //clean up "new" tag
                        text = text.slice(3);
                    }
                    const arr = text.split(": ");
                    if(arr[0] == null) {
                        return text.split(" ⇒ ")[1];
                    } else {
                        return arr[0] + ': ' + text.split(" ⇒ ")[1];
                    }
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
    console.log(result);
    fs.writeFile(`${patch}.json`, JSON.stringify(result, null, 2), 'utf8', () => { });
}).catch(err => console.log(err));
