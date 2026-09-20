const hasPunchTime = value => Boolean(value && String(value).trim() && String(value).trim() !== '--:--');

export const getMissingPunches = record => {
  const excluded = record?.isLeave || ['غائب', 'غياب غير مبرر', 'مغادرة مبكرة', 'إجازة سنوية', 'إجازة مرضية', 'إجازة غير مدفوعة'].includes(record?.status);
  return {
    missingIn: !excluded && !hasPunchTime(record?.timeIn),
    missingOut: !excluded && !hasPunchTime(record?.timeOut),
  };
};
