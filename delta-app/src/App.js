// import logo from './logo.svg';
import './App.css';
import * as patchUtil from './patchUtil.js';

import { useState } from "react";

function App() {
  const [delta, setDelta] = useState("");
  const [champ, setChamp] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  
  const handleDelta = async () => {
    console.log('handling');
    const sSplit = start.split('.');
    const eSplit = end.split('.');
    console.log(sSplit, eSplit);
    const res = await patchUtil.champDelta(parseInt(sSplit[0]), parseInt(sSplit[1]), parseInt(eSplit[0]), parseInt(eSplit[1]), champ);
    setDelta(JSON.stringify(res, null, 2));
  };

  return (
    <div className="App">
      <h1>fuck it we ball</h1>
      <div>
        <input value={start} onChange={e => setStart(e.target.value)}/>
        <input value={end} onChange={e => setEnd(e.target.value)}/>
      </div>
      <input value={champ} onChange={e => setChamp(e.target.value)}/>
      <p>{ delta }</p>
      <button onClick={handleDelta}>Get Patch</button>
    </div>
  );
}

export default App;
