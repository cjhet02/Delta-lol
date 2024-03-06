// const Papa = require('papaparse');
// const fs = require('fs')

// // const patch = fs.readFileSync(`12.9_clean.csv`, 'utf8');
// // const parsed = Papa.parse(patch, { header: false, dynamicTyping: true });
// // console.log(parsed.data);

// // getStats('Orianna').then((res) => {
// //     console.log(res);
// // })

// export async function getStats(champ) { //need endpoints
//     let s = 12;
//     let p = 9;
//     let eSeason = 12;
//     let ePatch = 12;
//     let matrix = [['Patch', 'Win_P']]; //['Row', 'Name', 'Class', 'Role', 'Tier', 'Score', 'Trend', 'Win', 'Role_P', 'Pick', 'Ban', 'KDA'];
//     do {
//         //handle edge cases
//         if(s === 13 && p === 2)
//             p = '1b';
//         else if (s === 12 && p === 24) {
//             s++;
//             p = 1;
//         }

//         const patch = fs.readFileSync(`${s}.${p}_clean.csv`, 'utf8');
//         const parsed = await Papa.parse(patch, { header: false, dynamicTyping: true });
//         const index = await findChamp(champ, parsed.data)
//         if (index != null) {
//             matrix.push([`${s}.${p}`, parsed.data[index][7]]);
//         }

//         if(p === 24) {
//             p = 1;
//             s++;
//         } else if (p === '1b') {
//             p = 3;
//         } else {
//             p++;
//         }
//     } while (s < eSeason || p <= ePatch);


//     return matrix;
// }

// function findChamp(champ, data) {
//     let left = 0;
//     let right = data.length - 1;
    
//     while (left <= right) {
//         const mid = Math.floor((left + right) / 2);
//         const midValue = data[mid][1];
//         if (midValue === champ) {
//             return mid; // Found the champ at index mid
//         } else if (midValue < champ) {
//             left = mid + 1; // Continue searching in the right half
//         } else {
//             right = mid - 1; // Continue searching in the left half
//         }
//     }
    
//     return null; // champ not found in the array
// }

