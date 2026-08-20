/** Central search engine. Use this module instead of direct string includes. */
import { useEffect, useState } from 'react';

export const DEFAULT_SEARCH_DEBOUNCE = 300;

export const normalizeSearchText = (value) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06EDـ]/g, '')
    .replace(/[أإآٱا]/g, 'ا')
    .replace(/[ىیي]/g, 'ي')
    .replace(/[ةۀہھه]/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
};

// Compatibility with pages already using the old exported name.
export const normalizeArabic = normalizeSearchText;

const flattenSearchValue = (value, seen = new WeakSet()) => {
  if (value === null || value === undefined) return [];
  if (value instanceof Date) return [value.toISOString()];
  if (typeof value !== 'object') return [String(value)];
  if (seen.has(value)) return [];
  seen.add(value);
  return Array.isArray(value)
    ? value.flatMap((entry) => flattenSearchValue(entry, seen))
    : Object.values(value).flatMap((entry) => flattenSearchValue(entry, seen));
};

const readField = (item, field) => {
  if (typeof field === 'function') return field(item);
  return String(field).split('.').reduce((value, key) => value?.[key], item);
};

/** Partial, unordered, multi-word matching across one or many values. */
export const matchesSearch = (values, query) => {
  const words = normalizeSearchText(query).split(' ').filter(Boolean);
  if (words.length === 0) return true;
  const searchableText = flattenSearchValue(values)
    .map(normalizeSearchText)
    .filter(Boolean)
    .join(' ');
  return words.every((word) => searchableText.includes(word));
};

/**
 * Fields may be property names, dot paths or selector functions. If omitted,
 * every scalar value is searched, making name/code/number search the default.
 */
export const advancedSearch = (items, query, searchFields = []) => {
  if (!Array.isArray(items)) return [];
  if (!normalizeSearchText(query)) return items;
  return items.filter((item) => matchesSearch(
    searchFields.length ? searchFields.map((field) => readField(item, field)) : item,
    query
  ));
};

export const createSearchPredicate = (query, searchFields = []) => (item) =>
  matchesSearch(
    searchFields.length ? searchFields.map((field) => readField(item, field)) : item,
    query
  );

export function useDebounce(value, delay = DEFAULT_SEARCH_DEBOUNCE) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}
