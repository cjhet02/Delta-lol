const statsCache = new Map();

async function getStats(patch) {
    const cached = statsCache.get(patch);
    if (cached !== undefined) return cached;

    const url = `${import.meta.env.VITE_API_URL || ''}/stats?patch=${patch}`;
    const data = await fetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });
    if (!data.ok) {
        throw new Error(`Stats request failed (${data.status})`);
    }
    const json = await data.json();
    statsCache.set(patch, json);
    return json;
}

function toTitleCase(str) {
    return str.replace(
      /\w\S*/g,
      function(txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      }
    );
}

function matchRole(champ, role, data, i) {
    if (i == null || i < 0 || i >= data.length) return null;

    if (champ !== data[i].Name) return null;
    if (role === data[i].Role) return i;

    if (role < data[i].Role) {
        for (let j = i - 1; j >= 0; j--) {
            if (data[j].Name !== champ) return null;
            if (data[j].Role === role) return j;
        }
    } else {
        for (let j = i + 1; j < data.length; j++) {
            if (data[j].Name !== champ) return null;
            if (data[j].Role === role) return j;
        }
    }
    return null;
}

function buildChampIndex(data) {
    const index = new Map();
    for (let i = 0; i < data.length; i++) {
        const key = data[i].Name;
        if (!index.has(key)) {
            index.set(key, new Map());
        }
        index.get(key).set(data[i].Role, i);
    }
    return index;
}

function subMat(matrixA, matrixB) {
    const numRowsA = matrixA.length;
    const bIndex = buildChampIndex(matrixB);
    const result = [];

    for (let i = 1; i < numRowsA; i++) {
        const roleMap = bIndex.get(matrixA[i].Name);
        const index = roleMap ? roleMap.get(matrixA[i].Role) ?? null : null;

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
    return result;
}

function getPatchLabels(sSeason, sPatch, eSeason, ePatch, sSub, eSub) {
    const labels = [];
    let s = sSeason, p = sPatch;
    let sub = sSub || null;

    while (s < eSeason || (s === eSeason && p <= ePatch)) {
        let display;
        if (s === 25 && sub) {
            display = `25.S1.${p}`;
        } else {
            display = `${s}.${p}`;
        }
        labels.push(display);

        if (s === 25 && sub === null && p === 1) {
            sub = 's1';
            p = 1;
        } else if (s === 25 && sub === 's1' && p === 3) {
            sub = null;
            p = 4;
        } else if (p === 24) {
            s++;
            if (s >= 15 && s <= 24) s = 25;
            p = 1;
            sub = null;
        } else if (p === '1b') {
            p = 3;
        } else if (p === '16b') {
            p = 18;
        } else {
            p++;
        }
    }
    return labels;
}

function findChamp(champ, data) {
    let left = 0;
    let right = data.length - 1;
    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (data[mid].Name === champ) {
            return mid;
        } else if (data[mid].Name < champ) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    return null;
}

export async function getChampStats(champ, role, sSeason, sPatch, eSeason, ePatch, sSub, eSub) {
    champ = toTitleCase(champ);
    const labels = getPatchLabels(sSeason, sPatch, eSeason, ePatch, sSub, eSub);

    const results = await Promise.all(labels.map(l => getStats(l).catch(() => null)));
    const patches = labels.map((l, i) => ({ label: l, data: results[i] }));

    const baseLabel = sSub ? `25.S1.${sPatch}` : `${sSeason}.${sPatch}`;
    const endLabel = eSub ? `25.S1.${ePatch}` : `${eSeason}.${ePatch}`;
    const baseEntry = patches.find(p => p.label === baseLabel && p.data?.champs);
    const endEntry = patches.find(p => p.label === endLabel && p.data?.champs);
    const delta = (baseEntry && endEntry) ? subMat(endEntry.data.champs, baseEntry.data.champs) : null;

    let matrix = [['Patch', 'Win', 'Pick', 'Ban']];
    let ticks = [];
    if (champ) {
        let patchIndex = 0;
        for (const p of patches) {
            if (!p.data?.champs) { patchIndex++; continue; }
            const idx = findChamp(champ, p.data.champs);
            const roleIdx = matchRole(champ, role, p.data.champs, idx);
            if (roleIdx != null) {
                const c = p.data.champs[roleIdx];
                ticks.push({ v: patchIndex, f: p.label });
                matrix.push([patchIndex, c.Win, c.Pick, c.Ban]);
            }
            patchIndex++;
        }
    } else {
        matrix = null;
    }

    return { matrix, delta: delta && delta.length > 1 ? delta : null, ticks };
}
