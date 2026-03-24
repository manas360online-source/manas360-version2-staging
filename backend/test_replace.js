const fs = require('fs');
const file = '/Users/chandu/Project/MANAS360_version2/frontend/src/pages/shared/PaymentStatus.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /onClick=\{\(\) \=\> navigate\('\/provider\/dashboard', \{ replace: true \}\)\}/g,
  "onClick={() => navigate(transactionId.startsWith('PROV_') ? '/provider/dashboard' : '/patient/dashboard', { replace: true })}"
);

fs.writeFileSync(file, content);
console.log('Replaced routing');
