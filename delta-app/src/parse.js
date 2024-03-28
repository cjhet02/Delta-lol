// const Papa = require('papaparse');
// const fs = require('fs')

// const patch = fs.readFileSync(`12.9_clean.csv`, 'utf8');
// const parsed = Papa.parse(patch, { header: true, dynamicTyping: true });
// console.log(parsed.data);

// async function batchPost(sSeason, sPatch, eSeason, ePatch) { //to post from local csv
//     let s = sSeason;
//     let p = sPatch;
//     do {
//         //handle edge cases
//         if (s === 13 && p === 2) {
//             p++;
//         }
//         else if (s === 12 && p === 24) {
//             s++;
//             p = 1;
//         } 
//         // console.log(`${s}.${p}`);
//         const patch = fs.readFileSync(`data/${s}.${p}_clean.csv`, 'utf8'); //change to get
//         const parsed = Papa.parse(patch, { header: true, dynamicTyping: true });
//         fetch('http://localhost:3002/stats', {
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json",
//             },
//             body: JSON.stringify({ patch: `${s}.${p}`, champs: parsed.data })
//         }).then((resp) => {
//             console.log(resp.ok);
//         })


//         if(p === 24) {
//             p = 1;
//             s++;
//         } else if (p === '1b') {
//             p = 3;
//         } else {
//             p++;
//         }
//     } while (s < eSeason || p <= ePatch);
// }
// getStats('Orianna').then((res) => {
//     console.log(res);
// })

async function getStats(patch) {
    const url = `http://localhost:3002/stats?patch=${patch}`;
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
    return data.json();
}

function toTitleCase(str) {
    return str.replace(
      /\w\S*/g,
      function(txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      }
    );
  }

export async function getChampStats(champ, role, sSeason, sPatch, eSeason, ePatch) {
    champ = toTitleCase(champ);
    console.log(role)
    let s = sSeason;
    let p = sPatch;
    let matrix = [['Patch', 'Win', 'Role_P', 'Pick', 'Ban', 'KDA']];
    do {
        //handle edge cases
        if(s === 13 && p === 2)
            p = 3;
        else if (s === 12 && p === 24) {
            s++;
            p = 1;
        }
        const patch = await getStats(`${s}.${p}`);
        const index = await findChamp(champ, role, patch.champs);
        if (index != null) {
            let res = Object.values(patch.champs[index]).slice(6, -1);
            res.unshift(`${s}.${p}`);
            matrix.push(res);
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

    return (matrix.length > 1 ? matrix : null);
}

//iterate up or down to match role (within champ)
function matchRole(champ, role, data, i) {
    if (champ !== data[i].Name) {
        return null;
    } else if (role === data[i].Role) {
        return i;
    } else if (role < data[i].Role) {
        return matchRole(champ, role, data, i - 1);
    } else {
        return matchRole(champ, role, data, i + 1);
    }
}

function findChamp(champ, role, data) {
    let left = 0;
    let right = data.length - 1;
    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (data[mid].Name === champ) {
            return matchRole(champ, role, data, mid); // Found the champ at index mid
        } else if (data[mid].Name < champ) {
            left = mid + 1; // Continue searching in the right half
        } else {
            right = mid - 1; // Continue searching in the left half
        }
    }
    
    return null; // champ not found in the array
}

