// Image / PDF export of the overview board. The board is redrawn as a
// standalone SVG (always light, print friendly) from the same geometry the
// view uses, rasterised through a canvas, and optionally wrapped in a minimal
// single-page PDF. No external libraries. buildSvg() and pdfFromJpeg() are
// pure so they can be unit-tested.

const FONT = "Inter, 'Segoe UI', Helvetica, Arial, sans-serif";
const LABEL_W = 170;
const ROW_H = 26;
const LEVEL_FILL = ["#f1f3f8", "#d9e0fb", "#b4c0f7", "#8c9bf1", "#5e6ef2"];

function esc(text) {
  return String(text == null ? "" : text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function f(n) {
  return Math.round(n * 100) / 100;
}

export default {
  LABEL_W,

  // model: {
  //   title, subtitle, width,
  //   months: [{ left, width, label, current }],
  //   load: [{ left, width, level, tooltip }],
  //   away: [{ left, width, title }],
  //   todayPct: number | null,
  //   lanes: [{ name, color, virtual, rows, bars: [{ left, width, row, title, color, kind, noLabel, isPhase, status }] }],
  //   footer
  // }
  // Returns { svg, width, height }.
  buildSvg(model) {
    let width = model.width || 1600;
    let trackX = LABEL_W + 16;
    let trackW = width - trackX - 16;
    let x = (pct) => trackX + (pct / 100) * trackW;
    let w = (pct) => (pct / 100) * trackW;

    let top = 70;
    let monthsH = 26;
    let loadH = 16;
    let y = top + monthsH + loadH + 6;
    let lanesStart = y;
    let laneBlocks = [];
    (model.lanes || []).forEach((lane) => {
      let h = lane.rows * ROW_H + 12;
      laneBlocks.push({ lane: lane, y: y, h: h });
      y += h;
    });
    let height = y + 36;

    let out = [];
    out.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + " " + height + '" font-family="' + esc(FONT) + '">');
    out.push('<rect width="100%" height="100%" fill="#ffffff"/>');
    out.push('<text x="16" y="34" font-size="22" font-weight="700" fill="#2b2f3a">' + esc(model.title) + "</text>");
    if (model.subtitle) out.push('<text x="16" y="54" font-size="12" fill="#7b8294">' + esc(model.subtitle) + "</text>");

    // Away bands behind everything.
    (model.away || []).forEach((a) => {
      out.push('<rect x="' + f(x(a.left)) + '" y="' + lanesStart + '" width="' + f(w(a.width)) + '" height="' + (y - lanesStart) + '" fill="#8087a0" fill-opacity="0.14"/>');
    });

    // Month header and grid lines.
    (model.months || []).forEach((m) => {
      out.push('<text x="' + f(x(m.left + m.width / 2)) + '" y="' + (top + 17) + '" font-size="12" font-weight="600" text-anchor="middle" fill="' + (m.current ? "#5e6ef2" : "#7b8294") + '">' + esc(m.label) + "</text>");
      out.push('<line x1="' + f(x(m.left)) + '" y1="' + top + '" x2="' + f(x(m.left)) + '" y2="' + y + '" stroke="#000" stroke-opacity="0.08"/>');
    });
    out.push('<line x1="' + f(x(100)) + '" y1="' + top + '" x2="' + f(x(100)) + '" y2="' + y + '" stroke="#000" stroke-opacity="0.08"/>');

    // Weekly load strip.
    out.push('<text x="16" y="' + (top + monthsH + 12) + '" font-size="11" font-weight="600" fill="#7b8294">' + esc(model.loadLabel || "Load") + "</text>");
    (model.load || []).forEach((c) => {
      out.push('<rect x="' + f(x(c.left)) + '" y="' + (top + monthsH) + '" width="' + Math.max(f(w(c.width)) - 1, 1) + '" height="' + loadH + '" rx="2" fill="' + LEVEL_FILL[c.level] + '"/>');
    });

    // Lanes.
    laneBlocks.forEach((b, i) => {
      out.push('<line x1="0" y1="' + b.y + '" x2="' + width + '" y2="' + b.y + '" stroke="#000" stroke-opacity="0.08"/>');
      if (b.lane.color) out.push('<circle cx="22" cy="' + (b.y + 17) + '" r="4.5" fill="' + esc(b.lane.color) + '"/>');
      out.push('<text x="' + (b.lane.color ? 34 : 16) + '" y="' + (b.y + 21) + '" font-size="13" font-weight="600" fill="' + (b.lane.virtual ? "#7b8294" : "#2b2f3a") + '">' + esc(b.lane.name) + "</text>");
      b.lane.bars.forEach((bar, j) => {
        let by = b.y + 6 + bar.row * ROW_H + (bar.isPhase ? 3 : 0);
        let color = bar.color || "#5e6ef2";
        if (bar.kind === "milestone") {
          let cx = x(bar.left);
          let r = bar.noLabel ? 4.5 : 6;
          out.push('<rect x="' + f(cx - r) + '" y="' + f(by + 11 - r) + '" width="' + r * 2 + '" height="' + r * 2 + '" rx="1.5" fill="' + esc(color) + '" transform="rotate(45 ' + f(cx) + " " + f(by + 11) + ')"/>');
          if (!bar.noLabel) out.push('<text x="' + f(cx + 12) + '" y="' + (by + 15) + '" font-size="11" fill="#2b2f3a">' + esc(bar.title) + "</text>");
          return;
        }
        let bx = x(bar.left);
        let bw = Math.max(w(bar.width), 3);
        let bh = bar.isPhase ? 16 : 22;
        let id = "c" + i + "_" + j;
        let fillOpacity = bar.isPhase ? (bar.status === "active" ? 0.34 : 0.14) : bar.away ? 0.35 : 0.22;
        let stroke = bar.status === "blocked" ? "#d64545" : color;
        out.push('<clipPath id="' + id + '"><rect x="' + f(bx) + '" y="' + f(by) + '" width="' + f(bw) + '" height="' + bh + '" rx="5"/></clipPath>');
        out.push(
          '<rect x="' + f(bx) + '" y="' + f(by) + '" width="' + f(bw) + '" height="' + bh + '" rx="5" fill="' + esc(color) + '" fill-opacity="' + fillOpacity + '" stroke="' + esc(stroke) + '" stroke-opacity="0.75"' + (b.lane.virtual ? ' stroke-dasharray="4 3"' : "") + (bar.status === "done" ? ' opacity="0.6"' : "") + "/>"
        );
        out.push('<rect x="' + f(bx) + '" y="' + f(by) + '" width="3.5" height="' + bh + '" fill="' + esc(stroke) + '" clip-path="url(#' + id + ')"/>');
        out.push('<g clip-path="url(#' + id + ')"><text x="' + f(bx + 9) + '" y="' + f(by + bh / 2 + 4) + '" font-size="' + (bar.isPhase ? 10.5 : 11.5) + '" fill="#2b2f3a">' + esc(bar.title) + "</text></g>");
      });
    });
    out.push('<line x1="0" y1="' + y + '" x2="' + width + '" y2="' + y + '" stroke="#000" stroke-opacity="0.08"/>');

    if (model.todayPct != null) {
      out.push('<line x1="' + f(x(model.todayPct)) + '" y1="' + top + '" x2="' + f(x(model.todayPct)) + '" y2="' + y + '" stroke="#5e6ef2" stroke-width="2" stroke-opacity="0.75"/>');
    }
    if (model.footer) out.push('<text x="16" y="' + (height - 14) + '" font-size="10.5" fill="#7b8294">' + esc(model.footer) + "</text>");
    out.push("</svg>");
    return { svg: out.join(""), width: width, height: height };
  },

  // Rasterises an SVG string to a canvas (browser only). Resolves with the canvas.
  svgToCanvas(svg, width, height, scale) {
    return new Promise((resolve, reject) => {
      let img = new Image();
      img.onload = () => {
        let canvas = document.createElement("canvas");
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        let ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas);
      };
      img.onerror = () => reject(new Error("svg-render-failed"));
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    });
  },

  canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob-failed"))), type, quality);
    });
  },

  // Minimal single-page PDF (A4 landscape) holding one JPEG, scaled to fit
  // with a margin. jpeg: Uint8Array, px: image size in pixels. Returns Uint8Array.
  pdfFromJpeg(jpeg, px) {
    let pageW = 842;
    let pageH = 595;
    let margin = 28;
    let scale = Math.min((pageW - 2 * margin) / px.width, (pageH - 2 * margin) / px.height);
    let w = px.width * scale;
    let h = px.height * scale;
    let x = (pageW - w) / 2;
    let y = (pageH - h) / 2;
    let content = "q " + w.toFixed(2) + " 0 0 " + h.toFixed(2) + " " + x.toFixed(2) + " " + y.toFixed(2) + " cm /Im0 Do Q";

    let enc = (s) => new TextEncoder().encode(s);
    let chunks = [];
    let offsets = [];
    let length = 0;
    let add = (data) => {
      let bytes = typeof data === "string" ? enc(data) : data;
      chunks.push(bytes);
      length += bytes.length;
    };
    let obj = (n, bodyFn) => {
      offsets[n] = length;
      add(n + " 0 obj\n");
      bodyFn();
      add("\nendobj\n");
    };

    add("%PDF-1.4\n");
    obj(1, () => add("<< /Type /Catalog /Pages 2 0 R >>"));
    obj(2, () => add("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"));
    obj(3, () => add("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + pageW + " " + pageH + "] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>"));
    obj(4, () => {
      add("<< /Type /XObject /Subtype /Image /Width " + px.width + " /Height " + px.height + " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " + jpeg.length + " >>\nstream\n");
      add(jpeg);
      add("\nendstream");
    });
    obj(5, () => add("<< /Length " + content.length + " >>\nstream\n" + content + "\nendstream"));

    let xref = length;
    let xrefText = "xref\n0 6\n0000000000 65535 f \n";
    for (let i = 1; i <= 5; i++) xrefText += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
    add(xrefText + "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF\n");

    let out = new Uint8Array(length);
    let pos = 0;
    chunks.forEach((c) => {
      out.set(c, pos);
      pos += c.length;
    });
    return out;
  },

  download(filename, blob) {
    let url = URL.createObjectURL(blob);
    let a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  filename(label, ext, now) {
    let d = now ? new Date(now) : new Date();
    let iso = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    return "academic-year-" + String(label).replace("/", "-") + "-overview-" + iso + "." + ext;
  },
};
