import logo from './logo.svg';
import './App.css';
import * as patchUtil from './patchUtil.js';

import { useState } from "react";

function App() {
  const [delta, setDelta] = useState("");

  const handleDelta = async () => {
    const res = await patchUtil.champDelta(13, 20, 14, 4, 'Illaoi');
    setDelta(JSON.stringify(res, null, 2));
  };

  return (
    <div className="App">
      <h1>fuck it we ball</h1>
      <p>{ delta }</p>
      <button onClick={handleDelta}>Get Patch</button>
    </div>
  );
}

export default App;
