// const fs = require('fs');

// {
//     feature = ''
//     old = []
//     new = []
//     delta = []
// }

async function getPatch(patch) {
    const url = `http://localhost:3002/patch?patch=${patch}`;
    const data = await fetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    }).catch((err) => {
        console.log(`error on patch ${patch} ${err}`);
        return null;
    });
    console.log(data)
    if (!data) {
        return {};
    }
    return data.json();
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
        const cIndex = getIndex(p1.changeList, p2.changeList[i].change, false);
        if (cIndex !== -1) {
            for (let j = 0; j < p2.changeList[i].values.length; j++) {
                const fIndex = getIndex(p1.changeList[cIndex].values, p2.changeList[i].values[j].feature, true);
                if (fIndex !== -1) {
                    p1.changeList[cIndex].values[fIndex].after = p2.changeList[i].values[j].after;
                    for (let k = 0; k < p2.changeList[i].values[j].delta.length; k++) {
                        if (!p1.changeList[cIndex].values[fIndex].delta[k])
                            p1.changeList[cIndex].values[fIndex].delta.push('new');
                        else
                            p1.changeList[cIndex].values[fIndex].delta[k] = parseFloat(p1.changeList[cIndex].values[fIndex].delta[k]) + parseFloat(p2.changeList[i].values[j].delta[k]);
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

function toTitleCase(str) {
    return str.replace(
      /\w\S*/g,
      function(txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      }
    );
  }

export async function champDelta(sSeason, sPatch, eSeason, ePatch, champ) {
    champ = toTitleCase(champ);
    let s = sSeason;
    let p = sPatch;
    let delta = {};
    while (s !== eSeason || p <= ePatch) {
        //handle edge cases
        if(s === 13 && p === 2)
            p = '1b';
        else if (s === 10 && p === 17)
            p = '16b';
        else if (s === 12 && p === 24) {
            s++;
            p = 1;
        }
        console.log(`${s}.${p}`)

        const patch = await getPatch(`${s}-${p}`);
        console.log(patch);
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

        if (p === 24) {
            p = 1;
            s++;
        } else if (p === '1b') {
            p = 3;
        } else if (p === '16b') {
            p = 18;
        } else {
            p++;
        }
    };
    console.log('out')
    return delta;
}

// getDelta(p1, p2).then((res) => {
//     console.log(JSON.stringify(res, null, 2));
// });

// const patch = "14-2";
// getPatch(patch).then(result => {
//     fs.writeFile(`patch-${patch}.json`, JSON.stringify(result, null, 2), 'utf8', () => { });
// }).catch(err => console.log(err));


