import logo from './logo.svg';
import './App.css';
import * as patchUtil from './patchUtil.js';
import { getChampStats } from './parse.js';
import { Chart } from "react-google-charts";
import React, { useState, useEffect, useRef } from 'react';
import { Dropdown, ButtonGroup, FloatingLabel, Form, Button } from 'react-bootstrap';

function App() {
  const [delta, setDelta] = useState({champ: "", changeList: []});
  const [champ, setChamp] = useState("");
  const [role, setRole] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [stats, setStats] = useState(null);
  
  // Function to extract specific columns from matrix data
  const extractColumns = (data, columns) => {
    return data?.map(row => columns.map(col => row[col]));
  };

  const options = {
    titleTextStyle: { color: '#f0f0f0' },
    legendTextStyle: { color: '#f0f0f0' }, 
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
      data={data}
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
      <hr class="solid"/>
      <h2>{champ} Changes: </h2>
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

  const handleRoleSelect = (role) => {
    setRole(role);
  };

  return (
    <div className="App">
      <img src={logo} alt="logo" style={{ margin: '-50px' }}/>
      <h1>Delta LoL</h1>
      <Form.Group>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
          <FloatingLabel label="Champion" controlId='floatingInput' className="mb-1" style={{ color: '#323438b2' }}>
            <Form.Control type='text' placeholder='Lebron James' value={champ} onChange={e => setChamp(e.target.value)} style={{ label: 'Champion', width: '150px', height: '38px' }}/>
          
          <Dropdown as={ButtonGroup}>
            <Dropdown.Toggle id="dropdown-basic" style={{ height: '38px', minWidth: '150px' }}>
              {role ? role : 'Select Role'}
            </Dropdown.Toggle>

            <Dropdown.Menu>
              <Dropdown.Item onClick={() => handleRoleSelect('Top')}>Top</Dropdown.Item>
              <Dropdown.Item onClick={() => handleRoleSelect('Jungle')}>Jungle</Dropdown.Item>
              <Dropdown.Item onClick={() => handleRoleSelect('Mid')}>Mid</Dropdown.Item>
              <Dropdown.Item onClick={() => handleRoleSelect('ADC')}>ADC</Dropdown.Item>
              <Dropdown.Item onClick={() => handleRoleSelect('Support')}>Support</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
          </FloatingLabel>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
          <FloatingLabel label="Before" controlId='floatingInput' className="mb-1" style={{ color: '#323438b2' }}>
            <Form.Control value={start} placeholder='lebron' onChange={e => setStart(e.target.value)} size="sm" style={{ padding: '0', lineHeight: '30px' }} />
          </FloatingLabel>
          <FloatingLabel label="After" controlId='floatingInput' className="mb-1" style={{ color: '#323438b2' }}>
            <Form.Control value={end} placeholder='james' onChange={e => setEnd(e.target.value)} size="sm" style={{ padding: '0', lineHeight: '30px' }}/>
          </FloatingLabel>
        </div>
        <Button type='submit' onClick={handleDelta} style={{ width: '320px' }}>Get Delta</Button>
      </Form.Group>
      <RenderChart data={extractColumns(stats, [0, 1])} />
      <RenderChart data={extractColumns(stats, [0, 3, 4])} />
      <RenderChart data={extractColumns(stats, [0, 5])} />
      <RenderChart data={extractColumns(stats, [0, 2])} />
      <div>
        <ChampionChanges { ...delta }/>
      </div>
    </div>
  );
}

export default App;
