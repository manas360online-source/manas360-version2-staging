const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const routesPath = path.join(repoRoot, 'src', 'routes', 'admin.routes.ts');
const rbacPath = path.join(repoRoot, 'src', 'middleware', 'rbac.middleware.ts');

const routesSource = fs.readFileSync(routesPath, 'utf8');
const rbacSource = fs.readFileSync(rbacPath, 'utf8');

const extractPolicyKeys = (source) => {
  const keys = new Set();
  const singleQuoted = /'([^']+)'\s*:\s*\[/g;
  const bare = /\b([a-zA-Z][a-zA-Z0-9_.]+)\s*:\s*\[/g;

  let match;
  while ((match = singleQuoted.exec(source)) !== null) {
    keys.add(match[1]);
  }
  while ((match = bare.exec(source)) !== null) {
    const key = match[1];
    if (key !== 'Record' && key !== 'ADMIN_POLICIES') keys.add(key);
  }

  return keys;
};

const policyKeys = extractPolicyKeys(rbacSource);

const statements = [];
const routeRegex = /router\.(get|post|put|patch|delete)\(([\s\S]*?)\);/g;
let routeMatch;
while ((routeMatch = routeRegex.exec(routesSource)) !== null) {
  statements.push(routeMatch[0]);
}

const roleOnlyViolations = [];
const unknownPolicyViolations = [];

for (const statement of statements) {
  const pathMatch = statement.match(/router\.(?:get|post|put|patch|delete)\('\/([^']*)'/);
  const routePath = pathMatch ? `/${pathMatch[1]}` : '(unknown-path)';

  const hasRequireRole = statement.includes('requireRole(');
  const hasRequirePolicy = statement.includes('requireAdminPolicy(');
  const hasRequirePermission = statement.includes('requirePermission(');

  if (hasRequireRole && !hasRequirePolicy && !hasRequirePermission) {
    roleOnlyViolations.push(routePath);
  }

  const policyUseRegex = /requireAdminPolicy\('([^']+)'\)/g;
  let policyUse;
  while ((policyUse = policyUseRegex.exec(statement)) !== null) {
    const usedKey = policyUse[1];
    if (!policyKeys.has(usedKey)) {
      unknownPolicyViolations.push({ routePath, usedKey });
    }
  }
}

if (roleOnlyViolations.length || unknownPolicyViolations.length) {
  console.error('Admin policy drift check failed.');

  if (roleOnlyViolations.length) {
    console.error('\nRoutes with requireRole but without requireAdminPolicy/requirePermission:');
    for (const routePath of roleOnlyViolations) {
      console.error(` - ${routePath}`);
    }
  }

  if (unknownPolicyViolations.length) {
    console.error('\nRoutes using unknown admin policy keys:');
    for (const item of unknownPolicyViolations) {
      console.error(` - ${item.routePath}: ${item.usedKey}`);
    }
  }

  process.exit(1);
}

console.log('Admin policy drift check passed.');
