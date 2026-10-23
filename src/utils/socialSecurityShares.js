export const calculateSocialSecurityShares = (employee, basicSalary, settings = {}) => {
  if (!employee.hasSocialSecurity) return { employeeDeduction: 0, companyContribution: 0, excessCompanyShare: 0 };
  const insuredSalary = Number(employee.socialSecuritySalary) || Number(basicSalary) || 0;
  const employeeRate = Number(settings.socialSecurityEmployeePercentage ?? 7.5) / 100;
  const companyRate = (Number(settings.socialSecurityCompanyPercentage ?? 14.25)
    + (employee.isHazardousProfession ? Number(settings.socialSecurityHazardousPercentage ?? 1) : 0)) / 100;
  const agreedSalary = employee.socialSecurityCompanyBaseSalary === '' || employee.socialSecurityCompanyBaseSalary == null
    ? Number(basicSalary) || 0 : Number(employee.socialSecurityCompanyBaseSalary);
  const excessSalary = employee.socialSecurityEmployeePaysExcess === true ? Math.max(0, insuredSalary - Math.max(0, agreedSalary)) : 0;
  const excessCompanyShare = excessSalary * companyRate;
  return { employeeDeduction: insuredSalary * employeeRate + excessCompanyShare,
    companyContribution: (insuredSalary - excessSalary) * companyRate, excessCompanyShare };
};
