import logo from './logo.svg';
import './App.css';
import * as patchUtil from './patchUtil.js';
import { getChampStats } from './parse.js';
import { Chart } from "react-google-charts";
import React, { useState } from 'react';
import { Dropdown, ButtonGroup, FloatingLabel, Form, Button, TabPane } from 'react-bootstrap';
import { Slider, Carousel, Tabs } from 'antd';
import StatsTable from './table.js';

function App() {
  const [delta, setDelta] = useState({champ: "", changeList: []});
  const [champ, setChamp] = useState("");
  const [role, setRole] = useState("");
  const [start, setStart] = useState("12.1");
  const [end, setEnd] = useState("14.8");
  const [stats, setStats] = useState(null);
  const [table, setTable] = useState(null);
  
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

  const Graphs = () => {
    const onChangeCard = (currentSlide) => {
      console.log(currentSlide);
    };
    if (stats) {
      return (
        <div style={{ margin: 'auto' }}>
          <Carousel afterChange={onChangeCard} dotPosition='top'>
            <div>
              <RenderChart data={extractColumns(stats, [0, 1])} />
              <h3 style={{ color: '#f0f0f0' }}>Win %</h3>
            </div>
            <div>
              <RenderChart data={extractColumns(stats, [0, 3, 4])} />
              <h3 style={{ color: '#f0f0f0' }}>Pick vs. Ban Rates</h3>
            </div>
            <div>
              <RenderChart data={extractColumns(stats, [0, 5])} />
              <h3 style={{ color: '#f0f0f0' }}>KDA</h3>
            </div>
            <div>
              <RenderChart data={extractColumns(stats, [0, 2])} />
              <h3 style={{ color: '#f0f0f0' }}>% in Role</h3>
            </div>
          </Carousel>
        </div>
      );
    } else
      return (
        <h4 align="center">Select a champion and range for stats!</h4>
      )
  };

  function formatter(value) {
    const i = Math.floor(value / 24);
    const season = i + 12;
    const patch = value - (24 * i) + 1;
    return season.toString() + "." + patch.toString();
  }
  // function deformat(value) {
  //   const split = value.split('.');
  //   if (!split[1])
  //     return 0;
  //   // const sNum = split[0].parseInt();
  //   // const pNum = split[1].parseInt();
  //   return (split[0].parseInt() - 12) + split[1].parseInt();
  // }

  function sliderChange(value) {
    setStart(formatter(value[0]));
    setEnd(formatter(value[1]));
  }

  const marks = {
    0: {
      label: '12.1',
      style: {
        color: '#f0f0f0'
      }},
    55: {
      label: '14.8',
      style: {
        color: '#f0f0f0'
      }}
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
  
  const ChampionChanges = ({ champ, changeList }) => {
    if (!champ) {
      return (<div style={{width: '950px', margin: 'auto', background: 'transparent', color: '#f0f0f0'}}>
        <h3>Select a champion for delta patch!</h3>
      </div>)  
    }
    return (
      <div style={{width: '950px', margin: 'auto', background: 'transparent', color: '#f0f0f0'}}>
        <h2>{champ} Changes: </h2>
        <h3>Before {start} ⇒ After {end}</h3> <br />
        {changeList?.map((changeItem, index) => (
          <div key={index} className="change-box">
            <ChangeItem key={index} {...changeItem} />
          </div>
        ))}
      </div>
    )
  };
  
  const handleDelta = async () => {
    const sSplit = start.split('.');
    const eSplit = end.split('.');
    const changes = await patchUtil.champDelta(parseInt(sSplit[0]), parseInt(sSplit[1]), parseInt(eSplit[0]), parseInt(eSplit[1]), champ);
    setDelta(changes);
    const statData = await getChampStats(champ, role.toUpperCase(), parseInt(sSplit[0]), parseInt(sSplit[1]), parseInt(eSplit[0]), parseInt(eSplit[1]));
    if (statData.matrix) {
      setStats(statData.matrix);
    }
    setTable(statData.delta);
    console.log(table);
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
        <div style={{ width: '500px', margin: 'auto', }}>
          <Slider range={{ draggableTrack: true }}
            defaultValue={[0, 58]} min={0} max={55}
            tooltip={{ formatter }} onChange={sliderChange}
            marks={marks} included={true}/>
        </div>
        <Button type='submit' onClick={handleDelta} style={{ width: '320px' }}>Get Delta</Button>
      </Form.Group>
      <Graphs />
      <div>
        <Tabs centered className="custom-tab">
          <TabPane tab="Stats" key="1">
              {table !== null && <StatsTable data={table} />}
          </TabPane>
          <TabPane tab="Patch" key="2">
            <ChampionChanges {...delta}/>
          </TabPane>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
