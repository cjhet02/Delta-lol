// import logo from './logo.svg';
import './App.css';
import * as patchUtil from './patchUtil.js';
import { getStats } from './parse.js';
import { useState } from "react";
import { Chart } from "react-google-charts";

function App() {
  const [delta, setDelta] = useState({champ: "", changeList: []});
  const [champ, setChamp] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const sample = [
    ['Patch', 'Win_P'],
    ['12.9', 47.54],
    ['12.10', 52.14],
    ['12.11', 51.02],
    ['12.12', 49.59]
  ];

  const options = {
    title: "Orianna",
    hAxis: { title: "Patch", titleTextStyle: { color: "#333" } },
    vAxis: { minValue: 0 },
    chartArea: { width: "50%", height: "70%" },
  };

  const ChangeItem = ({ change, values }) => (
    <div>
      <h3>{change}</h3>
      <ul>
        {values.map((value, index) => (
          <li key={index}>
            <h4>{value.feature}</h4>
            <div>
              {value.before.join(', ')} ⇒ {value.after.join(', ')}<br />
              <strong>Delta:</strong> {value.delta.join(', ')}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
  
  const ChampionChanges = ({ champ, changeList }) => (
    <div>
      <h2>{champ} Changes</h2>
      <strong>Before {start} ⇒ After {end}</strong> <br />
      {changeList.map((changeItem, index) => (
        <ChangeItem key={index} {...changeItem} />
      ))}
    </div>
  );
  
  const handleDelta = async () => {
    const sSplit = start.split('.');
    const eSplit = end.split('.');
    const res = await patchUtil.champDelta(parseInt(sSplit[0]), parseInt(sSplit[1]), parseInt(eSplit[0]), parseInt(eSplit[1]), champ);
    setDelta(res);
  };

  return (
    <div className="App">
      <h1>fuck it we ball</h1>
      <Chart
      chartType="AreaChart"
      width="100%"
      height="400px"
      data={sample}
      options={options}
      />
      <div>
        <input value={start} onChange={e => setStart(e.target.value)}/>
        <input value={end} onChange={e => setEnd(e.target.value)}/>
      </div>
      <input value={champ} onChange={e => setChamp(e.target.value)} />
      <button onClick={handleDelta}>Get Patch</button>
      <div>
        <ChampionChanges { ...delta }/>
      </div>
    </div>
  );
}

export default App;
