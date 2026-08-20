import React from 'react';
import ReactSelect from 'react-select';
import { matchesSearch } from '../utils/searchEngine';

/**
 * System-wide react-select wrapper. All searchable selects inherit the same
 * Arabic/English normalization as regular search fields automatically.
 */
const SearchSelect = ({ filterOption, styles, ...props }) => {
  const centralizedFilter = (option, inputValue) => matchesSearch(
    [option?.label, option?.value, option?.data],
    inputValue
  );

  return (
    <ReactSelect
      {...props}
      filterOption={filterOption || centralizedFilter}
      styles={{
        ...styles,
        menu: (base, state) => ({
          ...base,
          zIndex: 10050,
          backgroundColor: '#ffffff',
          ...(typeof styles?.menu === 'function' ? styles.menu(base, state) : {})
        }),
        menuList: (base, state) => ({
          ...base,
          maxHeight: 280,
          backgroundColor: '#ffffff',
          ...(typeof styles?.menuList === 'function' ? styles.menuList(base, state) : {})
        }),
        option: (base, state) => ({
          ...base,
          backgroundColor: state.isSelected ? '#dbeafe' : state.isFocused ? '#eff6ff' : '#ffffff',
          color: '#0f172a',
          lineHeight: 1.6,
          whiteSpace: 'normal',
          textAlign: 'right',
          ...(typeof styles?.option === 'function' ? styles.option(base, state) : {})
        })
      }}
    />
  );
};

export default SearchSelect;
