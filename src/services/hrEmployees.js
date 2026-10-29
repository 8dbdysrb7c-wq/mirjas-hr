import { getEmployees } from '../store';
import { isActiveHREmployee } from '../utils/employeeStatus';

export const getActiveHREmployees = async () => (await getEmployees()).filter(isActiveHREmployee);
