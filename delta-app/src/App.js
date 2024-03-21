// import logo from './logo.svg';
import './App.css';
import * as patchUtil from './patchUtil.js';
import { getChampStats } from './parse.js';
import { useState } from "react";
import { Chart } from "react-google-charts";
import React from 'react';

function App() {
  const [delta, setDelta] = useState({champ: "", changeList: []});
  const [champ, setChamp] = useState("");
  const [role, setRole] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [stats, setStats] = useState(null);

  const options = {
    titleTextStyle: { color: '#f0f0f0' },
    legendTextStyle: { color: '#f0f0f0' }, 
    title: "Stats Over Time",
    hAxis: { title: "Patch", titleTextStyle: { color: "#f0f0f0" }, textStyle: { color: '#f0f0f0' } },
    vAxis: { minValue: 0, textStyle: { color: '#f0f0f0' } },
    chartArea: { width: "50%", height: "70%" },
    backgroundColor: '#282c34',

  };

  function RenderChart({ data }) {
    if (!data)
      return null;

    return (<Chart
      chartType="AreaChart"
      width="100%"
      height="400px"
      data={stats}
      options={options}
    />)
  };

  const ChangeItem = ({ change, values }) => (
    <div>
      <h3>{change}</h3>
      <ul>
        {values.map((value, index) => (
          <div key={index} className="feature-box">
            <h4>{value.feature}</h4>
            <div>
              {value.before.join(', ')} ⇒ {value.after.join(', ')}<br />
              <strong>Delta:</strong> {value.delta.map((delta, index) => (
                <React.Fragment key={index}>
                  <span className={delta >= 0 ? ((delta === '0' || delta === 'change') ? 'neutral' : 'positive') : (delta === 'new' ? 'positive' : 'negative')}>
                    {(isNaN(delta) || Number.isInteger(parseFloat(delta)) ? delta : parseFloat(delta).toFixed(3))}
                  </span>
                  {index !== value.delta.length - 1 && ', '}
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}
      </ul>
    </div>
  );
  
  const ChampionChanges = ({ champ, changeList }) => (
    <div>
      <h2>{champ} Changes</h2>
      <h3>Before {start} ⇒ After {end}</h3> <br />
      {changeList?.map((changeItem, index) => ( 
        <div key={index} className="change-box">
          <ChangeItem key={index} {...changeItem} />
        </div>
      ))}
    </div>
  );
  
  const handleDelta = async () => {
    const sSplit = start.split('.');
    const eSplit = end.split('.');
    const changes = await patchUtil.champDelta(parseInt(sSplit[0]), parseInt(sSplit[1]), parseInt(eSplit[0]), parseInt(eSplit[1]), champ);
    setDelta(changes);
    const statData = await getChampStats(champ, role.toUpperCase(), parseInt(sSplit[0]), parseInt(sSplit[1]), parseInt(eSplit[0]), parseInt(eSplit[1]));
    setStats(statData);
  };

  return (
    <div className="App">
      <h1>Delta</h1>
      <RenderChart data={stats}/>
      <div>
        <input value={start} onChange={e => setStart(e.target.value)}/>
        <input value={end} onChange={e => setEnd(e.target.value)}/>
      </div>
      <input value={champ} onChange={e => setChamp(e.target.value)} />
      <input value={role} onChange={e => setRole(e.target.value)} />
      <button type="submit" onClick={handleDelta}>Get Patch</button>
      <div>
        <ChampionChanges { ...delta }/>
      </div>
    </div>
  );
}

export default App;
