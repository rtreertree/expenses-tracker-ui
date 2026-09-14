export function resolveRoutePage(page) {
  switch (page) {
    case 'new':
    case 'edit':
      return 'new';
    case 'transactions':
    case 'compare':
    case 'stats':
    case 'explore':
    case 'reports':
      return page;
    case 'dashboard':
    case undefined:
    case null:
    default:
      return 'dashboard';
  }
}
