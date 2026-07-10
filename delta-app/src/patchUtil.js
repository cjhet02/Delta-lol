const patchCache = new Map();

async function getPatch(patch) {
    const cached = patchCache.get(patch);
    if (cached !== undefined) return cached;

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
    if (!data) {
        patchCache.set(patch, {});
        return {};
    }
    const json = await data.json();
    patchCache.set(patch, json);
    return json;
}

function buildChangeMap(changeList) {
    const map = new Map();
    for (let i = 0; i < changeList.length; i++) {
        const key = changeList[i].change.split(' ')[0];
        map.set(key, { index: i, entry: changeList[i] });
    }
    return map;
}

function buildFeatureMap(values) {
    const map = new Map();
    for (let i = 0; i < values.length; i++) {
        map.set(values[i].feature, { index: i, entry: values[i] });
    }
    return map;
}

async function getDelta(p1, p2) {
    if (!p1 || (Object.keys(p1).length === 0)) {
        return p2;
    } else if (!p2 || (Object.keys(p2).length === 0)) {
        return p1;
    }

    const p1ChangeMap = buildChangeMap(p1.changeList);

    for (let i = 0; i < p2.changeList.length; i++) {
        const changeKey = p2.changeList[i].change.split(' ')[0];
        const match = p1ChangeMap.get(changeKey);

        if (match) {
            const p1Change = match.entry;
            const p1FeatureMap = buildFeatureMap(p1Change.values);

            for (let j = 0; j < p2.changeList[i].values.length; j++) {
                const feature = p2.changeList[i].values[j];
                const fMatch = p1FeatureMap.get(feature.feature);

                if (fMatch) {
                    fMatch.entry.after = feature.after;
                    for (let k = 0; k < feature.delta.length; k++) {
                        if (!fMatch.entry.delta[k])
                            fMatch.entry.delta.push('new');
                        else
                            fMatch.entry.delta[k] = parseFloat(fMatch.entry.delta[k]) + parseFloat(feature.delta[k]);
                    }
                } else {
                    p1Change.values.push(feature);
                }
            }
        } else {
            p1.changeList.push(p2.changeList[i]);
        }
    }
    return p1;
}

function toTitleCase(str) {
    return str.replace(
      /\w\S*/g,
      function(txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      }
    );
  }

function getPatchLabels(sSeason, sPatch, eSeason, ePatch) {
    const labels = [];
    let s = sSeason, p = sPatch;
    while (s !== eSeason || p <= ePatch) {
        if (s === 13 && p === 2) p = 3;
        else if (s === 10 && p === 17) p = '16b';
        else if (s === 12 && p === 24) { s++; p = 1; }

        labels.push({ label: `${s}-${p}`, display: `${s}.${p}` });

        if (p === 24) { p = 1; s++; }
        else if (p === '1b') p = 3;
        else if (p === '16b') p = 18;
        else p++;
    }
    return labels;
}

export async function champDelta(sSeason, sPatch, eSeason, ePatch, champ) {
    champ = toTitleCase(champ);
    const labels = getPatchLabels(sSeason, sPatch, eSeason, ePatch);

    const results = await Promise.all(labels.map(l => getPatch(l.label).catch(() => ({}))));
    const patches = labels.map((l, i) => ({ ...l, data: results[i] }));

    let delta = {};
    for (const p of patches) {
        if (!p.data || Object.keys(p.data).length === 0) continue;

        for (let c = 0; c < p.data.changes.length; c++) {
            if (p.data.changes[c].champ === champ) {
                delta = await getDelta(delta, p.data.changes[c]);
            }
        }
    }
    return delta;
}
