import React from 'react';
import AppTextInput from './AppTextInput';

// AppInput is an alias to AppTextInput for consistency and better reusability
// This allows all forms to use a consistent naming convention
export default AppTextInput;

// Re-export all types for convenience
export type { default as AppTextInput } from './AppTextInput';
