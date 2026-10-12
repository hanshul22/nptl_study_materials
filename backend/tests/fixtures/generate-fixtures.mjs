// Rebuilds the PDF fixtures in this folder. Run from the repo root:
//   node backend/tests/fixtures/generate-fixtures.mjs
//
// Output: OS-Notes.pdf (text), scanned.pdf (no text layer), encrypted.pdf (password).
//
// encrypted.pdf user password:  test1234
// encrypted.pdf owner password: test1234-owner
// (Opening the file needs the user password. These are test values, not secrets.)

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';

const out = (name) => fileURLToPath(new URL(name, import.meta.url));

/** Collects a PDFKit document into a Buffer. */
function render(options, draw) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 56, ...options });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    draw(doc);
    doc.end();
  });
}

function textPage(doc, heading, paragraphs) {
  doc.font('Helvetica-Bold').fontSize(18).text(heading);
  doc.moveDown();
  doc.font('Helvetica').fontSize(12);
  for (const p of paragraphs) {
    doc.text(p, { align: 'left' });
    doc.moveDown();
  }
}

// 1) OS-Notes.pdf: 3 pages of real, selectable text.
const osNotes = await render({ info: { Title: 'OS Notes - CPU Scheduling' } }, (doc) => {
  textPage(doc, 'CPU Scheduling: FCFS and Round Robin', [
    'First Come First Served (FCFS) is the simplest CPU scheduling algorithm. Processes are ' +
      'placed in a ready queue in the order they arrive, and the CPU is given to the process at ' +
      'the head of the queue. FCFS is non-preemptive: once a process gets the CPU it keeps it ' +
      'until it finishes or blocks for I/O.',
    'FCFS can produce a long average waiting time. When one long process arrives before several ' +
      'short ones, the short processes wait behind it. This is called the convoy effect.',
    'Round Robin (RR) is designed for time-sharing systems. Each process receives a small unit ' +
      'of CPU time called a time quantum. When the quantum expires, the process is preempted and ' +
      'moved to the back of the ready queue. If the quantum is too large, RR behaves like FCFS; ' +
      'if it is too small, context switching overhead dominates.',
  ]);
  doc.addPage();
  textPage(doc, 'Priority Scheduling and Starvation', [
    'In Priority Scheduling every process is assigned a priority and the CPU is allocated to the ' +
      'process with the highest priority. Processes with equal priority are scheduled in FCFS ' +
      'order. Priority scheduling can be preemptive or non-preemptive.',
    'The main problem with priority scheduling is starvation, also called indefinite blocking. ' +
      'In a busy system a steady stream of high-priority processes can keep the CPU away from ' +
      'the lower ones. Low-priority processes may wait indefinitely and never get to run.',
    'Priorities can be defined internally, for example from memory requirements or the ratio of ' +
      'I/O burst to CPU burst, or externally, for example from the importance of the user or ' +
      'the process.',
  ]);
  doc.addPage();
  textPage(doc, 'Aging', [
    'Aging is a technique that solves the starvation problem in priority scheduling. The ' +
      'priority of a process that has been waiting in the ready queue for a long time is ' +
      'gradually increased as time passes.',
    'For example, the scheduler may raise the priority of every waiting process by one level ' +
      'every 15 minutes. Even a process that starts with the lowest priority will eventually ' +
      'reach a priority high enough to be selected, so it is guaranteed to execute.',
    'Aging therefore trades a small amount of scheduling precision for fairness. Multilevel ' +
      'feedback queues use the same idea: a process that waits too long in a low-priority queue ' +
      'is moved up to a higher-priority queue.',
  ]);
});

// 2) scanned.pdf: 2 pages with vector shapes only, no text layer.
const scanned = await render({ info: { Title: 'Scanned (no text layer)' } }, (doc) => {
  doc.rect(80, 80, 400, 560).lineWidth(4).stroke('#444444');
  doc.circle(280, 300, 90).fill('#999999');
  doc.addPage();
  doc.rect(80, 80, 400, 560).lineWidth(4).stroke('#444444');
  for (let y = 140; y < 600; y += 40)
    doc.moveTo(110, y).lineTo(450, y).lineWidth(6).stroke('#777777');
});

// 3) encrypted.pdf: 1 page, AES-128, user password required to open.
const encrypted = await render(
  {
    userPassword: 'test1234',
    ownerPassword: 'test1234-owner',
    pdfVersion: '1.7',
    info: { Title: 'Encrypted fixture' },
  },
  (doc) => {
    textPage(doc, 'Encrypted document', [
      'This page is only readable with the user password. It exists to test that the PDF ' +
        'pipeline rejects password-protected files with PDF_ENCRYPTED.',
    ]);
  },
);

for (const [name, buf] of [
  ['OS-Notes.pdf', osNotes],
  ['scanned.pdf', scanned],
  ['encrypted.pdf', encrypted],
]) {
  if (buf.subarray(0, 5).toString('latin1') !== '%PDF-') throw new Error(`${name}: bad header`);
  if (buf.length >= 100 * 1024) throw new Error(`${name}: ${buf.length} bytes, expected < 100 KB`);
  writeFileSync(out(name), buf);
  console.log(`${name}: ${buf.length} bytes`);
}
