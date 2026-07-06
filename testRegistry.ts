import { getTemplatesForCourt } from './src/lib/templateRegistry';

const enTemplates = getTemplatesForCourt('district-court', 'en');
console.log('EN District Court Templates:');
enTemplates.forEach(t => console.log(t.name, '->', t.language, t.filePath));

const hiTemplates = getTemplatesForCourt('district-court', 'hi');
console.log('\nHI District Court Templates:');
hiTemplates.forEach(t => console.log(t.name, '->', t.language, t.filePath));
