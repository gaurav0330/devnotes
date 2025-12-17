export const stripHtml = (html) => {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return div.textContent || "";
};

export const folderColor = (name) =>
  ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500"][
    name.charCodeAt(0) % 4
  ];
