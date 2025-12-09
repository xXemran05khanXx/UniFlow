/**
 * DepartmentSelect Component
 * Reusable dropdown for selecting departments
 */

import React, { useEffect, useState } from 'react';
import { Department } from '../../types';
import { departmentService } from '../../services/departmentService';

interface DepartmentSelectProps {
  value?: string;
  onChange: (departmentId: string, department?: Department) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  includeAll?: boolean;
  activeOnly?: boolean;
  error?: string;
  label?: string;
}

export const DepartmentSelect: React.FC<DepartmentSelectProps> = ({
  value,
  onChange,
  placeholder = 'Select Department',
  className = '',
  disabled = false,
  required = false,
  includeAll = false,
  activeOnly = true,
  error,
  label
}) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    loadDepartments();
  }, [activeOnly]);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const data = await departmentService.getAllDepartments(activeOnly);
      setDepartments(data);
    } catch (err) {
      console.error('Error loading departments:', err);
      setLoadError('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selectedDept = departments.find(d => d._id === selectedId);
    onChange(selectedId, selectedDept);
  };

  return (
    <div className={`department-select ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <select
        value={value || ''}
        onChange={handleChange}
        disabled={disabled || loading}
        required={required}
        className={`
          w-full px-3 py-2 border rounded-md shadow-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
          ${error ? 'border-red-500' : 'border-gray-300'}
        `}
      >
        <option value="" disabled>
          {loading ? 'Loading departments...' : placeholder}
        </option>
        
        {includeAll && (
          <option value="all">All Departments</option>
        )}
        
        {departments.map((dept) => (
          <option key={dept._id} value={dept._id}>
            {dept.code} - {dept.name}
          </option>
        ))}
      </select>

      {loadError && (
        <p className="mt-1 text-sm text-red-600">{loadError}</p>
      )}
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default DepartmentSelect;
