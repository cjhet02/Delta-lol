import logo from './logo.svg';
import './App.css';
import * as patchUtil from './patchUtil.js';
import { getChampStats } from './parse.js';
import { Chart } from "react-google-charts";
import React, { useState } from 'react';
import { Dropdown, ButtonGroup, FloatingLabel, Form, Button, TabPane, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { Slider, Carousel, Tabs, ConfigProvider, Collapse } from 'antd';
import StatsTable from './table.jsx';
import { useEffect } from 'react';
import { Autocomplete, TextField } from '@mui/material';

function App() {
  const [champList, setChampList] = useState([]);
  const [delta, setDelta] = useState({champ: "", changeList: []});
  const [champ, setChamp] = useState("");
  const [role, setRole] = useState("");
  const [start, setStart] = useState("12.1");
  const [end, setEnd] = useState("26.13");
  const [stats, setStats] = useState(null);
  const [ticks, setTicks] = useState([]);
  const [table, setTable] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const darkThemeStyles = {
    '& .MuiInputBase-root': {
      backgroundColor: '#3338440',
      color: '#f0f0f0',
      borderRadius: '0.12rem',
      height: '38px',
      '& fieldset': { borderColor: '#969696' },
      '&:hover fieldset': { borderColor: '#187685' },
      '&.Mui-focused fieldset': { borderColor: '#187685' },
    },
    '& input::placeholder': { color: '#c7c7c7', opacity: 1 },
  };

  // Fetch champion list on component mount
  useEffect(() => {
    fetch('http://localhost:3002/stats?patch=26.13')
      .then(response => response.json())
      .then(data => {
        const names = [...new Set(data.champs.map(champ => champ.Name))].sort();
        setChampList(names);
      }).catch(() => {});
    }, []);

  // Reset stats and hasSearched when champ, role, start, or end changes
  useEffect(() => {
    setHasSearched(false);
    setStats(null);
  }, [champ, role, start, end]);

  // Function to extract specific columns from matrix data
  const extractColumns = (data, columns) => {
    return data?.map(row => columns.map(col => row[col]));
  };

  const options = {
    titleTextStyle: { color: '#f0f0f0' },
    legendTextStyle: { color: '#f0f0f0' }, 
    hAxis: { title: "Patch", titleTextStyle: { color: "#f0f0f0" }, textStyle: { color: '#f0f0f0' }, slantedText: true, slantedTextAngle: 45 },
    vAxis: { minValue: 0, textStyle: { color: '#f0f0f0' } },
    chartArea: { width: "50%", height: "70%" },
    backgroundColor: '#282c34',
    colors: ['#00E5FF', '#EA4335'],
  };

  function RenderChart({ data }) {
    if (!data || data.length <= 1)
      return null;

    const chartOptions = {
      ...options,
      hAxis: { ...options.hAxis, ticks: ticks }
    };

    return (<Chart
      key={windowWidth}
      chartType="AreaChart"
      width="100%"
      height="400px"
      data={data}
      options={chartOptions}
    />)
  };

  const Graphs = () => {
    const onChangeCard = (currentSlide) => {
      console.log(currentSlide);
    };
    if (!hasSearched) {
      return (
        <h4 align="center" style={{ color: '#f0f0f0' }}>Select a champion and role for stats!</h4>
      );
    }
    if (!stats) {
      return (
        <h4 align="center" style={{ color: '#f0f0f0' }}>
          No data found for {champ} {role ? `${role}` : '(no role selected)'}. Check that you have the right role selected.
        </h4>
      );
    }
    return (
      <div style={{ margin: 'auto' }}>
        <Carousel afterChange={onChangeCard} dotPosition='top'>
          <div>
            <RenderChart data={extractColumns(stats, [0, 1])} />
            <h3 style={{ color: '#f0f0f0' }}>Win %</h3>
          </div>
          <div>
            <RenderChart data={extractColumns(stats, [0, 2, 3])} />
            <h3 style={{ color: '#f0f0f0' }}>Pick vs. Ban Rates</h3>
          </div>
        </Carousel>
      </div>
    );
  };

  function formatter(value) {
    if (value <= 71) {
      // Seasons 12-14: 24 patches each (positions 0-71)
      const i = Math.floor(value / 24);
      const season = i + 12;
      const patch = value - (24 * i) + 1;
      return season.toString() + "." + patch.toString();
    } else if (value <= 97) {
      // Season 25: positions 72-97 (26 patches: S1.1, S1.2, S1.3, then 4-24)
      const offset = value - 72;
      if (offset < 3) {
        return "25.S1." + (offset + 1).toString();
      } else {
        return "25." + (offset + 1).toString();
      }
    } else {
      // Season 26+: positions 98+
      const season = 26;
      const patch = value - 97;
      return season.toString() + "." + patch.toString();
    }
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
    110: {
      label: '26.13',
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
              <strong>Delta:</strong> {value.delta.map((delta, index) => {
                const isCooldown = /cooldown/i.test(value.feature);
                const positiveClass = isCooldown ? 'negative' : 'positive';
                const negativeClass = isCooldown ? 'positive' : 'negative';
                return (
                <React.Fragment key={index}>
                  <span className={delta >= 0 ? ((delta === '0' || delta === 'change') ? 'neutral' : positiveClass) : (delta === 'new' ? positiveClass : negativeClass)}>
                    {(isNaN(delta) || Number.isInteger(parseFloat(delta)) ? delta : parseFloat(delta).toFixed(3))}
                  </span>
                  {index !== value.delta.length - 1 && ', '}
                </React.Fragment>
                );
              })}
            </div>
          </div>
        ))}
      </ul>
    </div>
  );
  
  const ChampionChanges = ({ champ, changeList }) => {
    if (!champ) {
      return (<div style={{maxWidth: '950px', margin: 'auto', background: 'transparent', color: '#f0f0f0', textAlign: 'center'}}>
        <h3>Select a champion for delta patch!</h3>
      </div>)  
    }
    return (
      <div style={{maxWidth: '950px', margin: 'auto', background: 'transparent', color: '#f0f0f0'}}>
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
    setStats(null);
    setHasSearched(false);
    setLoading(true);

    const sSplit = start.split('.');
    const eSplit = end.split('.');
    const sSeason = parseInt(sSplit[0]);
    const eSeason = parseInt(eSplit[0]);

    // Handle S1 sub-division format (e.g., "25.S1.3")
    let sPatchNum, sSub = null;
    if (sSplit[1] === 'S1') {
        sSub = 's1';
        sPatchNum = parseInt(sSplit[2]);
    } else {
        sPatchNum = parseInt(sSplit[1]);
    }

    let ePatchNum, eSub = null;
    if (eSplit[1] === 'S1') {
        eSub = 's1';
        ePatchNum = parseInt(eSplit[2]);
    } else {
        ePatchNum = parseInt(eSplit[1]);
    }

    const [changes, statData] = await Promise.all([
      patchUtil.champDelta(sSeason, sPatchNum, eSeason, ePatchNum, sSub, eSub, champ),
      getChampStats(champ, role, sSeason, sPatchNum, eSeason, ePatchNum, sSub, eSub)
    ]);

    setDelta(changes);
    if (statData.matrix && statData.matrix.length > 1) {
      setStats(statData.matrix);
    }
    if (statData.ticks) {
      setTicks(statData.ticks);
    }
    setTable(statData.delta);
    setLoading(false);
    setHasSearched(true);
  };

  const handleRoleSelect = (role) => {
    setRole(role);
  };

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#187685' } }}>
    <div className="App">
      <div style={{ position: 'relative' }}>
        <OverlayTrigger
          trigger="click"
          rootClose
          placement="right"
          overlay={
            <Tooltip style={{ maxWidth: '350px', backgroundColor: '#2d3139', color: '#f0f0f0', border: '1px solid #444', fontSize: '0.85rem', textAlign: 'left' }}>
              Delta LoL compares League of Legends champion statistics between patches — including actual patch changes, win rate, pick/ban rates, KDA, and more.
              <br /><br />
              Whether you're getting back into the game and want to see how your favorite champion has changed, or you're a competitive player looking for an edge, Delta LoL is for you!
              <br /><br />
              <strong>How to Use:</strong> Select a champion and role, then choose the patch range you want to compare. Click "Get Delta" to see the changes.
              <br /><br />
              <strong>Patch Data Sources:</strong> Patch data is sourced from the official <a href="https://www.leagueoflegends.com/en-us/news/tags/patch-notes/" target="_blank" rel="noopener noreferrer" style={{ color: '#00E5FF' }}>League of Legends patch notes</a>.
              <br /><br />
              <strong>Ranked Data Sources:</strong> Seasons 12–25 use community-compiled data from <a href="https://huggingface.co/datasets/HakimT/lol-champion-ranked-stats" target="_blank" rel="noopener noreferrer" style={{ color: '#00E5FF' }}>Hugging Face</a>; Season 26 and on use data pulled from <a href="https://lolalytics.com" target="_blank" rel="noopener noreferrer" style={{ color: '#00E5FF' }}>Lolalytics</a>.
              <br /><br />
              <strong>Limitations:</strong> Data may be incomplete for some patches. Stats are limited to Emerald+ ranked games across all regions. Rank distributions and sample sizes are not accounted for.
            </Tooltip>
          }
        >
          <Button style={{ position: 'absolute', left: 0, top: 0, backgroundColor: '#187685', borderColor: '#187685', borderRadius: '0.12rem', padding: '4px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#f0f0f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </Button>
        </OverlayTrigger>
        <img src={logo} alt="logo" style={{ margin: '-50px' }}/>
        <h1>Delta LoL</h1>
      </div>
      <Form.Group>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Autocomplete freeSolo options={champList} value={champ} onInputChange={(_, v) => setChamp(v)} sx={{ width: 170 }} renderInput={(params) => (
              <TextField {...params} placeholder="Champion" size='small' sx={{ ...darkThemeStyles }} />
            )}
          />
          
          <Dropdown as={ButtonGroup} style={{ marginLeft: '3px' }}>
            <Dropdown.Toggle className='thin-input' id="dropdown-basic" style={{ width: '70px', backgroundColor: '#187685', borderColor: '#187685' }}>
              {role ? role : 'Role'}
            </Dropdown.Toggle>

            <Dropdown.Menu>
              <Dropdown.Item onClick={() => handleRoleSelect('Top')}>Top</Dropdown.Item>
              <Dropdown.Item onClick={() => handleRoleSelect('Jungle')}>Jungle</Dropdown.Item>
              <Dropdown.Item onClick={() => handleRoleSelect('Mid')}>Mid</Dropdown.Item>
              <Dropdown.Item onClick={() => handleRoleSelect('ADC')}>ADC</Dropdown.Item>
              <Dropdown.Item onClick={() => handleRoleSelect('Support')}>Support</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
        <div style={{ width: '500px', margin: 'auto', }}>
          <Slider range={{ draggableTrack: true }}
            defaultValue={[0, 110]} min={0} max={110}
            tooltip={{ formatter }} onChange={sliderChange}
            marks={marks} included={true}/>
        </div>
        <Button type='submit' onClick={handleDelta} disabled={loading} style={{ width: '320px', backgroundColor: '#187685', borderColor: '#187685' }}>{loading ? 'Loading...' : 'Get Delta'}</Button>
      </Form.Group>
      <Collapse defaultActiveKey={['graphs']} style={{ maxWidth: '950px', margin: 'auto', marginTop: '20px' }}>
        <Collapse.Panel header="Graphs" key="graphs">
          <Graphs/>
        </Collapse.Panel>
      </Collapse>
      <div>
        <Tabs centered className="custom-tab">
          <TabPane tab="Stats" key="1">
            <h2 style={{color: '#f0f0f0'}}>All Stat Changes: </h2>
            <h3 style={{color: '#f0f0f0'}}>Before {start} ⇒ After {end}</h3> <br />
            {table !== null && <StatsTable data={table} champion={champ} />}
          </TabPane>
          <TabPane tab="Patch" key="2">
            <ChampionChanges {...delta}/>
          </TabPane>
        </Tabs>
      </div>
    </div>
    </ConfigProvider>
  );
}

export default App;
