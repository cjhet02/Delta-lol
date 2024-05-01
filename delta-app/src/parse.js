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

function statMatchRole(champ, role, data, i, up) {
    if (!data[i] || !data[i].Name || data[i].Name !== champ)
        return null;
    else if (data[i].Name === champ && data[i].Role === role)
        return i;

    return (up ? statMatchRole(champ, role, data, i - 1) : statMatchRole(champ, role, data, i + 1));
}

  //HANDLE MISSING ROLE
function subMat(matrixA, matrixB) {
    console.log(matrixA, matrixB);
    const numRowsA = matrixA.length;
    const numRowsB = matrixB.length;
    const numCols = Object.keys(matrixA[0]).length; // Assuming all rows have the same length

    // Determine the number of rows for the result matrix
    const numRowsResult = Math.max(numRowsA, numRowsB);

    const result = [];

    for (let i = 1; i < numRowsA; i++) {
        let index = findChamp(matrixA[i].Name, matrixA[i].Role, matrixB);
        index = (statMatchRole(matrixA[i]['Name'], matrixA[i]['Role'], matrixB, index, true) || statMatchRole(matrixA[i]['Name'], matrixA[i]['Role'], matrixB, index, false));

        if (index !== null) {
            let row = {};
            for (const key in matrixA[i]) {
                const val1 = matrixA[i][key];
                const val2 = matrixB[index][key];
                if (!isNaN(val1)) {
                    row[key] = (val1 - val2).toFixed(2);
                } else {
                    row[key] = val1;
                }
            }
            result.push(row);
        }
    }
    console.log('result', result);
    return result;
}

export async function getChampStats(champ, role, sSeason, sPatch, eSeason, ePatch) {
    champ = toTitleCase(champ);
    
    let base, delta;
    let s = sSeason;
    let p = sPatch;
    let matrix = [['Patch', 'Win', 'Role_P', 'Pick', 'Ban', 'KDA']];
    while (s !== eSeason || p <= ePatch) {
        //handle edge cases
        if(s === 13 && p === 2)
            p = 3;
        else if (s === 12 && p === 24) {
            s++;
            p = 1;
        }
        console.log(`${s}.${p}`)
        const patch = await getStats(`${s}.${p}`);
        //find overall delta (for table)
        if (`${s}.${p}` === `${sSeason}.${sPatch}`) {
            base = patch;
        } else if (`${s}.${p}` === `${eSeason}.${ePatch}`) {
            delta = subMat(patch.champs, base.champs);
        }

        //get champ stats (for graphs)
        if (champ) {
            let index = findChamp(champ, role, patch.champs);
            index = matchRole(champ, role, patch.champs, index);
            
            if (index != null) {
                let res = Object.values(patch.champs[index]).slice(6, -1);
                res.unshift(`${s}.${p}`);
                matrix.push(res);
            }
        } else
            matrix = null;

        if(p === 24) {
            p = 1;
            s++;
        } else if (p === '1b') {
            p = 3;
        } else {
            p++;
        }
    }
    return (delta.length > 1 ? {matrix, delta} : null);
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
            // return matchRole(champ, role, data, mid); // Found the champ at index mid
            return mid;
        } else if (data[mid].Name < champ) {
            left = mid + 1; // Continue searching in the right half
        } else {
            right = mid - 1; // Continue searching in the left half
        }
    }
    
    return null; // champ not found in the array
}

