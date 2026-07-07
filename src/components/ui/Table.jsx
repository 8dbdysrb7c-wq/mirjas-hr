import React from 'react';

export const TableContainer = ({ children, className = '' }) => {
  return (
    <div className={`table-container ${className}`}>
      <table>
        {children}
      </table>
    </div>
  );
};

export const TableHead = ({ children }) => <thead>{children}</thead>;

export const TableHeader = ({ children, className = '', ...props }) => (
  <th className={className} {...props}>{children}</th>
);

export const TableBody = ({ children }) => <tbody>{children}</tbody>;

export const TableRow = ({ children, className = '', ...props }) => (
  <tr className={className} {...props}>{children}</tr>
);

export const TableCell = ({ children, dataLabel, className = '', ...props }) => (
  <td className={className} data-label={dataLabel} {...props}>
    {children}
  </td>
);
