// import logo from './logo.svg';
import './App.css';
import * as patchUtil from './patchUtil.js';

import { useState } from "react";

function App() {
  const [delta, setDelta] = useState({champ: "", changeList: []});
  const [champ, setChamp] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

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
