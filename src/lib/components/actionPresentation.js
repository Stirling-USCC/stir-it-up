const variants = new Set([
  'primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark',
  'outline-primary', 'outline-secondary', 'outline-success', 'outline-danger',
  'outline-warning', 'outline-info', 'outline-light', 'outline-dark'
]);

// Domain actions describe intent; Bootstrap class names stay in the UI.
export function actionClasses(action) {
  const variant = variants.has(action.variant) ? action.variant : 'outline-primary';
  return `btn btn-${variant}${action.emphasis === 'primary' ? ' btn-lg' : ''}`;
}
