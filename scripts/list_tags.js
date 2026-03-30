fetch("https://web-production-1f2e2.up.railway.app/api/tiktok/avatars")
.then(res => res.json())
.then(data => {
  const types = new Set();
  const values = {};
  data.data.forEach(a => {
    a.tag_groups?.forEach(g => {
      types.add(g.tag_type);
      if(!values[g.tag_type]) values[g.tag_type] = new Set();
      g.tags.forEach(t => values[g.tag_type].add(t));
    });
  });
  console.log(Array.from(types));
  console.log(values);
});
