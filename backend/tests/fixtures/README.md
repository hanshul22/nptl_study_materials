# PDF fixtures

Small PDFs for the notes pipeline tests (B2).

| File            | What it is                                                              | Expected result           |
| --------------- | ----------------------------------------------------------------------- | ------------------------- |
| `OS-Notes.pdf`  | 3 pages of selectable text on CPU scheduling (FCFS/RR, priority, aging) | `ready`, 3 pages          |
| `scanned.pdf`   | 2 pages with shapes only, no text layer                                 | `failed`, `PDF_NO_TEXT`   |
| `encrypted.pdf` | 1 page, AES-128, needs a password to open                               | `failed`, `PDF_ENCRYPTED` |

Page 2 of `OS-Notes.pdf` says low-priority processes may wait indefinitely, which matches the example MCQ in `dtos.md` section 6.3 (`reference: OS-Notes.pdf`, page 14 there is only an example).

`encrypted.pdf` user password: `test1234` (owner password: `test1234-owner`). Test values only.

## Regenerate

From the repo root:

```
npm install
node backend/tests/fixtures/generate-fixtures.mjs
```

The script uses the `pdfkit` devDependency and overwrites the three files.
