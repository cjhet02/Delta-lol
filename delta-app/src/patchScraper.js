const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function getPatch(patch) {
    const url = `https://www.leagueoflegends.com/en-gb/news/game-updates/patch-${patch}-notes/`;
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const results = [];
    const champs = $('div.patch-change-block div');

    champs.each((index, elem) => {
        const changeList = [];
        const changes = $(elem).find('h4.change-detail-title');
        const champ = $(elem).find('h3.change-title').text();

        changes.each((index, elem) => {
            const values = $(elem).next().children().toArray().map(function(x) {
                return $(x).text();
            });
            
            changeList.push({ change: $(elem).text(), values })
        })

        results.push({ champ, changeList })
    })
    return results;
}

const patch = "14-2";
getPatch(patch).then(result => {
    console.log(result);
    fs.writeFile('14-2.json', JSON.stringify(result, null, 2), 'utf8', () => { });
}).catch(err => console.log(err));
