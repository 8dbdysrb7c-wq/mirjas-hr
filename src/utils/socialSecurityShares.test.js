import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSocialSecurityShares } from './socialSecurityShares.js';
const employee = { hasSocialSecurity: true, socialSecuritySalary: 800, socialSecurityEmployeePaysExcess: true, socialSecurityCompanyBaseSalary: 650 };
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.000001, `${actual} != ${expected}`);
test('800 insured, 650 agreed: employee bears both shares on the excess 150', () => {
  const shares = calculateSocialSecurityShares(employee, 650);
  close(shares.employeeDeduction, 81.375);
  close(shares.companyContribution, 92.625);
  close(shares.excessCompanyShare, 21.375);
  close(shares.employeeDeduction + shares.companyContribution, 174);
});
test('disabled option preserves existing calculation on full insured salary', () => {
  const shares = calculateSocialSecurityShares({ ...employee, socialSecurityEmployeePaysExcess: false }, 650);
  close(shares.employeeDeduction, 60);
  close(shares.companyContribution, 114);
});
test('blank company base uses basic salary; lower insured salary creates no excess', () => {
  close(calculateSocialSecurityShares({ ...employee, socialSecurityCompanyBaseSalary: '' }, 650).employeeDeduction, 81.375);
  close(calculateSocialSecurityShares({ ...employee, socialSecuritySalary: 600 }, 650).companyContribution, 85.5);
});
test('uses configured percentages including hazardous contribution', () => {
  const shares = calculateSocialSecurityShares({ ...employee, isHazardousProfession: true }, 650, { socialSecurityEmployeePercentage: 8, socialSecurityCompanyPercentage: 14, socialSecurityHazardousPercentage: 2 });
  close(shares.employeeDeduction, 88);
  close(shares.companyContribution, 104);
});
test('unregistered employee has no deductions and zero agreed base is respected', () => {
  assert.deepEqual(calculateSocialSecurityShares({ ...employee, hasSocialSecurity: false }, 650), { employeeDeduction: 0, companyContribution: 0, excessCompanyShare: 0 });
  close(calculateSocialSecurityShares({ ...employee, socialSecurityCompanyBaseSalary: 0 }, 650).companyContribution, 0);
});
