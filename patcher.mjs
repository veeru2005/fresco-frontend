import fs from 'fs';
let c = fs.readFileSync('src/pages/Profile.tsx', 'utf8');
c = c.replace(/className='bg-slate-50 text-slate-500 cursor-not-allowed px-3'/g, "disabled={!isEditing}");
