const search = "task 1";
const normalRows = [
  { id: 1, cells: ["Task 1", "", false] },
  { id: 2, cells: ["Another Task", "", false] }
];
const q = search.toLowerCase();
const filtered = normalRows.filter(r => r.cells.some(c => String(c).toLowerCase().includes(q)));
console.log(filtered);
