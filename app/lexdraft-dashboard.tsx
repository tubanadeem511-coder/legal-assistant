"use client";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { useState, type FormEvent } from "react";

type DocumentType = "NDA" | "Service Agreement" | "Formal Business Letter";
type View = "Dashboard" | "Create Document" | "My Documents";
type DraftForm = { type: DocumentType; first: string; second: string; jurisdiction: string; purpose: string; details: string };
type SavedDraft = { id: string; title: string; type: DocumentType; text: string };
const emptyForm: DraftForm = { type: "NDA", first: "", second: "", jurisdiction: "", purpose: "", details: "" };

function makeSample(form: DraftForm) {
  const intro = `This sample is prepared for ${form.first} and ${form.second} in connection with ${form.purpose}. It should be reviewed and adapted before use.`;
  const extra = form.details ? `\n\nADDITIONAL DETAILS\n${form.details}` : "";
  if (form.type === "NDA") return `SAMPLE DRAFT - NON-DISCLOSURE AGREEMENT\n\n${intro}\n\n1. CONFIDENTIAL INFORMATION\nConfidential Information means non-public business, technical, financial, or other information disclosed for the stated purpose.\n\n2. OBLIGATIONS\nEach receiving party will use Confidential Information only for the stated purpose, protect it with reasonable care, and share it only with representatives who need to know it and are bound by confidentiality obligations.\n\n3. EXCLUSIONS\nThese obligations do not apply to information publicly available through no breach, already known without restriction, independently developed, or rightfully received from another source.\n\n4. TERM AND GOVERNING LAW\nThe parties should specify the term and duration of confidentiality obligations. The laws of ${form.jurisdiction} will govern this Sample, subject to review by qualified counsel.${extra}\n\nSIGNATURES\n\n${form.first}: __________________________  Date: __________\n\n${form.second}: _________________________  Date: __________`;
  if (form.type === "Service Agreement") return `SAMPLE DRAFT - SERVICE AGREEMENT\n\n${intro}\n\n1. SERVICES\n${form.first} ("Client") requests that ${form.second} ("Provider") perform services related to ${form.purpose}. Attach a detailed scope, deliverables, milestones, and acceptance criteria.\n\n2. FEES AND PAYMENT\nThe parties will agree in writing on fees, invoicing, payment deadlines, and reimbursable expenses before work begins.\n\n3. RESPONSIBILITIES\nEach party will provide the information, access, and cooperation reasonably needed to perform its responsibilities.\n\n4. TERM AND GOVERNING LAW\nThe parties should specify the contract term and termination notice. The laws of ${form.jurisdiction} will govern this Sample, subject to review by qualified counsel.${extra}\n\nSIGNATURES\n\n${form.first}: __________________________  Date: __________\n\n${form.second}: _________________________  Date: __________`;
  return `SAMPLE DRAFT - FORMAL BUSINESS LETTER\n\n${new Date().toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric" })}\n\nTo: ${form.second}\nFrom: ${form.first}\nJurisdiction: ${form.jurisdiction}\n\nSubject: ${form.purpose}\n\nDear ${form.second},\n\nI am writing on behalf of ${form.first} regarding ${form.purpose}. We would welcome the opportunity to discuss this matter and agree on appropriate next steps.${extra}\n\nThis letter is a sample for discussion and does not create a binding commitment unless separately agreed in a signed writing.\n\nSincerely,\n\n${form.first}`;
}

export default function LexDraftDashboard() {
  const [view, setView] = useState<View>("Dashboard");
  const [form, setForm] = useState(emptyForm);
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState<SavedDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function update(key: keyof DraftForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  }

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!form.first.trim() || !form.second.trim() || !form.jurisdiction.trim() || !form.purpose.trim()) {
      setError("Enter both party names, a jurisdiction, and the document purpose.");
      return;
    }
    setLoading(true);
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 550));
      const text = makeSample(form);
      setDraft(text);
      setSaved((items) => [{ id: `${Date.now()}`, title: form.purpose, type: form.type, text }, ...items]);
      setMessage("Sample draft ready. Review and edit it before use.");
    } catch {
      setError("Unable to prepare this sample. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(draft);
      setMessage("Draft copied.");
      setError("");
    } catch {
      setError("Clipboard access is unavailable. Select the draft text to copy it.");
    }
  }

  async function downloadPdf() {
    try {
      const pdf = await PDFDocument.create();
      const regular = await pdf.embedFont(StandardFonts.Helvetica);
      const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
      const margin = 54;
      const width = 612;
      const height = 792;
      const lines = draft.split("\n").flatMap((line) => {
        if (!line) return [""];
        const output: string[] = [];
        let current = "";
        for (const word of line.split(/\s+/)) {
          const next = current ? `${current} ${word}` : word;
          if (next.length > 92 && current) {
            output.push(current);
            current = word;
          } else current = next;
        }
        output.push(current);
        return output;
      });
      let page = pdf.addPage([width, height]);
      let y = height - margin;
      for (const [index, line] of lines.entries()) {
        if (y < margin) {
          page = pdf.addPage([width, height]);
          y = height - margin;
        }
        const heading = index === 0 || /^\d+\.|^[A-Z][A-Z\s&-]{2,}$/.test(line);
        page.drawText(line, { x: margin, y, size: heading ? 11 : 10, font: heading ? bold : regular, color: rgb(0.12, 0.18, 0.27), maxWidth: width - margin * 2 });
        y -= line ? 16 : 9;
      }
      const bytes = await pdf.save();
      const blob = new Blob([new Uint8Array(bytes).buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `lexdraft-${form.type.toLowerCase().replaceAll(" ", "-")}.pdf`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("PDF exported from your latest edits.");
      setError("");
    } catch {
      setError("PDF export failed. Please try again.");
    }
  }

  function openDraft(item: SavedDraft) {
    setDraft(item.text);
    setForm((current) => ({ ...current, type: item.type }));
    setView("Create Document");
    setMessage("Saved sample opened. Edits are kept in this session.");
    setError("");
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#home" onClick={() => setView("Dashboard")}><span className="brand-mark">L</span><span>LexDraft <em>AI</em></span></a>
      <div className="workspace-label">WORKSPACE</div>
      <nav aria-label="Main navigation">{(["Dashboard", "Create Document", "My Documents"] as View[]).map((item, index) => <button key={item} className={`nav-item ${view === item ? "active" : ""}`} onClick={() => setView(item)} type="button"><span className="nav-icon">{["▦", "+", "▤"][index]}</span>{item}{item === "My Documents" && saved.length > 0 && <span className="nav-count">{saved.length}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="privacy-note">◈ <span>Private workspace<br /><small>Drafts stay in this session</small></span></div><div className="profile"><span className="avatar">L</span><span>LexDraft workspace<small>Sample mode</small></span></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div>Workspace <span>/</span> <strong>{view}</strong></div><span className="mode"><i /> Sample mode</span></header>
      {view === "My Documents" ? <section className="page-content">
        <div className="page-heading"><div><small>YOUR WORKSPACE</small><h1>My documents</h1><p>Drafts created during this session appear here.</p></div><button className="primary small" onClick={() => setView("Create Document")} type="button">+ Create document</button></div>
        {saved.length ? <div className="saved-list">{saved.map((item) => <button className="saved-item" key={item.id} onClick={() => openDraft(item)} type="button"><span className="file-mark">▤</span><span><strong>{item.title}</strong><small>{item.type} · Sample draft</small></span><span className="saved-arrow">›</span></button>)}</div> : <div className="empty"><span>▤</span><h2>No documents yet</h2><p>Create a sample draft and it will appear here for this session.</p><button className="secondary" onClick={() => setView("Create Document")} type="button">Create your first draft</button></div>}
      </section> : <section className="page-content">
        <div className="page-heading"><div><small>LEGAL DOCUMENT WORKSPACE</small><h1>{view === "Dashboard" ? "Good documents start here." : "Create a document"}</h1><p>Build a clear first draft, then make it yours.</p></div><span className="workspace-callout">✧ <span>Thoughtful drafts,<br /><strong>ready for your review</strong></span></span></div>
        <div className="summary-row"><div><small>DOCUMENT TYPES</small><strong>03</strong><span>Ready to draft</span></div><div><small>YOUR DRAFTS</small><strong>{String(saved.length).padStart(2, "0")}</strong><span>This session</span></div><div className="summary-hint"><i /><span><strong>Start with the essentials</strong><small>Specific details help shape a useful sample.</small></span></div></div>
        <div className="workspace-grid">
          <section className="panel form-panel"><div className="panel-title"><div><small>STEP 01 OF 02</small><h2>Draft details</h2></div><span>▤</span></div><p className="intro">Tell us what you need. Required fields are marked.</p>
            <form onSubmit={generate} noValidate>
              <label htmlFor="type">Document type <b>*</b></label><select id="type" value={form.type} onChange={(event) => update("type", event.target.value as DocumentType)}><option>NDA</option><option>Service Agreement</option><option>Formal Business Letter</option></select>
              <div className="fields"><div><label htmlFor="first">First party <b>*</b></label><input id="first" value={form.first} onChange={(event) => update("first", event.target.value)} placeholder="e.g. Acme Studio LLC" autoComplete="organization" /></div><div><label htmlFor="second">Second party <b>*</b></label><input id="second" value={form.second} onChange={(event) => update("second", event.target.value)} placeholder="e.g. Jordan Lee" /></div></div>
              <label htmlFor="jurisdiction">Jurisdiction / country <b>*</b></label><input id="jurisdiction" value={form.jurisdiction} onChange={(event) => update("jurisdiction", event.target.value)} placeholder="e.g. California, United States" />
              <label htmlFor="purpose">Document purpose <b>*</b></label><textarea id="purpose" rows={2} value={form.purpose} onChange={(event) => update("purpose", event.target.value)} placeholder="What is this document for?" />
              <label htmlFor="details">Additional details <span>OPTIONAL</span></label><textarea id="details" rows={3} value={form.details} onChange={(event) => update("details", event.target.value)} placeholder="Dates, deliverables, terms, or other context..." />
              {error && <p className="feedback error" role="alert">{error}</p>}{message && !error && <p className="feedback success" role="status">{message}</p>}
              <button className="primary generate" type="submit" disabled={loading}>{loading ? <><i className="spinner" /> Preparing sample...</> : <>✧ &nbsp;Generate sample draft <span>↗</span></>}</button><p className="form-note">◈ &nbsp;No AI service is connected. This creates a sample only.</p>
            </form>
          </section>
          <section className="panel editor-panel"><div className="panel-title"><div><small>STEP 02 OF 02</small><h2>Review your draft</h2></div><span className={`draft-status ${draft ? "ready" : ""}`}><i />{draft ? "SAMPLE DRAFT" : "AWAITING INPUT"}</span></div>
            <div className="editor-toolbar"><span>{draft ? `${form.type} · Sample` : "Your document will appear here"}</span><div><button className="copy-button" onClick={copyDraft} disabled={!draft} type="button" aria-label="Copy draft" title="Copy draft">▢</button><button className="download-button" onClick={downloadPdf} disabled={!draft} type="button">⇩ Download PDF</button></div></div>
            <label className="sr-only" htmlFor="draft">Editable sample draft</label><textarea id="draft" className="draft-editor" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Complete the details on the left, then generate a sample draft. You can edit the text here before copying or exporting." />
            <div className="editor-meta"><span><i /> Editable document</span><span>{draft ? `${draft.trim().split(/\s+/).length} words` : "0 words"}</span></div><div className="disclaimer"><span>◈</span><p><strong>Important</strong> AI-generated drafts are for informational purposes only and are not legal advice. Have a qualified lawyer review documents before use.</p></div>
          </section>
        </div><footer>LexDraft AI · Sample workspace <span>Review every document with a qualified legal professional.</span></footer>
      </section>}
    </main>
  </div>;
}
