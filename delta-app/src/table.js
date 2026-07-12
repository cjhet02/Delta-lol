import './table.css';
import React, { useState, useMemo, useCallback } from 'react';
import { Table, TableContainer, TableHead, TableBody, TableRow, TableCell, TableSortLabel, Paper } from '@mui/material';

const allColumns = [
  { title: 'Champion', dataIndex: 'Name' },
  { title: 'Role', dataIndex: 'Role' },
  { title: 'Tier', dataIndex: 'Tier' },
  { title: 'Score', dataIndex: 'Score' },
  { title: 'Trend', dataIndex: 'Trend' },
  { title: 'Win %', dataIndex: 'Win' },
  { title: 'Role %', dataIndex: 'Role_P' },
  { title: 'Pick %', dataIndex: 'Pick' },
  { title: 'Ban %', dataIndex: 'Ban' },
  { title: 'KDA', dataIndex: 'KDA' }
];

const TEXT_FIELDS = new Set(['Name', 'Role']);

function filterColumns(data) {
  return allColumns.filter(col => {
    if (TEXT_FIELDS.has(col.dataIndex)) return true;
    return data.some(row => parseFloat(row[col.dataIndex]) !== 0);
  });
}

const cellStyleMap = new Map();
function getCellStyle(value) {
  const key = isNaN(value) ? 'nan' : (value < 0 ? 'neg' : 'pos');
  let style = cellStyleMap.get(key);
  if (!style) {
    style = {
      color: key === 'nan' ? '#f0f0f0' : (key === 'neg' ? 'red' : 'green')
    };
    cellStyleMap.set(key, style);
  }
  return style;
}

const TableComponent = ({ data }) => {
  const [orderBy, setOrderBy] = useState('');
  const [order, setOrder] = useState('asc');

  const columns = useMemo(() => filterColumns(data), [data]);

  const handleSort = useCallback((columnId) => {
    setOrder(prev => {
      const isAsc = orderBy === columnId && prev === 'asc';
      return isAsc ? 'desc' : 'asc';
    });
    setOrderBy(columnId);
  }, [orderBy]);

  const sortedData = useMemo(() => {
    if (!orderBy) return data;
    return [...data].sort((a, b) => {
      const aValue = parseFloat(a[orderBy]);
      const bValue = parseFloat(b[orderBy]);
      if (order === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [data, orderBy, order]);

  return (
    <TableContainer component={Paper} style={{width: '950px', margin: 'auto', background: 'transparent'}}>
      <Table>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell key={column.dataIndex} style={{color: '#f0f0f0'}}>
                <TableSortLabel
                  active={orderBy === column.dataIndex}
                  direction={orderBy === column.dataIndex ? order : 'asc'}
                  onClick={() => handleSort(column.dataIndex)}
                >
                  {column.title}
                </TableSortLabel>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedData.map((row, index) => (
            <TableRow key={index}>
              {columns.map((column) => (
                <TableCell key={column.dataIndex} style={getCellStyle(row[column.dataIndex])}>
                  {row[column.dataIndex]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default TableComponent;
