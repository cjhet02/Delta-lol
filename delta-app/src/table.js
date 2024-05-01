import './table.css';
import React, { useState } from 'react';
import { Table, TableContainer, TableHead, TableBody, TableRow, TableCell, TableSortLabel, Paper } from '@mui/material';

const columns = [
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

const TableComponent = ({ data }) => {
  const [orderBy, setOrderBy] = useState('');
  const [order, setOrder] = useState('asc');

  const handleSort = (columnId) => {
    const isAsc = orderBy === columnId && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(columnId);
  };

  const sortedData = data.sort((a, b) => {
    const aValue = parseFloat(a[orderBy]);
    const bValue = parseFloat(b[orderBy]);

    if (order === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const getCellStyle = (value) => {
    return {
      color: (isNaN(value) ? '#f0f0f0' : (value < 0 ? 'red' : 'green'))
    };
  };

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
