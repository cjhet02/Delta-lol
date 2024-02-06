const axios = require('axios');
const cheerio = require('cheerio');

async function getPatch(patch) {
    const url = `https://www.leagueoflegends.com/en-gb/news/game-updates/patch-${patch}-notes/`;
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const results = [];
    $('[id=patch-notes-container]').children((i, elem) => {
        const champ = $(elem).find('h3.change-title > a').text();
        
        // changes
        const changes = [];
        $(elem).find('h4.change-detail-title').each((i, elem) => {
            const values = $(elem).find('div ul').children().toArray().map(function(x) {
                return $(x).text();
            });
            // console.log(values);
            changes.push({ ability: "balls", values });
        });
        // console.log(changes);

        // const changes = $(elem).find('div ul').children().toArray().map(function(x) {
        //     return $(x).text();
        // });

        results.push({ champ, changes });
    })
    return results;
}

const patch = "14-2";
getPatch(patch).then(result => {
    console.log(JSON.stringify(result, null, 2));
}).catch(err => console.log(err));
