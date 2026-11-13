function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

export function printPlainDocument(title: string, text: string) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!doc || !win) {
    frame.remove();
    return;
  }
  doc.open();
  doc.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; color: #0f172a; font-family: Arial, sans-serif; }
    main { max-width: 720px; margin: 0 auto; padding: 32px; }
    h1 { margin: 0 0 16px; font-size: 22px; }
    pre { white-space: pre-wrap; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(title)}</h1>
    <pre>${escapeHtml(text)}</pre>
  </main>
</body>
</html>`);
  doc.close();
  win.focus();
  win.print();
  window.setTimeout(() => frame.remove(), 1000);
}
