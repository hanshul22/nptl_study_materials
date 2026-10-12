import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';
import { Dialog } from './Dialog';

function Harness({ dismissible = true }: { dismissible?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      {open && (
        <Dialog title="Edit thing" onClose={() => setOpen(false)} dismissible={dismissible}>
          <p>Body text</p>
          <button>First</button>
          <button>Last</button>
        </Dialog>
      )}
    </>
  );
}

/** fireEvent.click does not focus, so focus the opener first like a real click would. */
function openDialog() {
  const opener = screen.getByRole('button', { name: 'Open' });
  opener.focus();
  fireEvent.click(opener);
  return opener;
}

it('is a labelled modal dialog and moves focus inside', () => {
  render(<Harness />);
  openDialog();
  const dialog = screen.getByRole('dialog', { name: 'Edit thing' });
  expect(dialog).toHaveAttribute('aria-modal', 'true');
  expect(dialog).toHaveAttribute('aria-labelledby');
  expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
});

it('traps Tab and Shift+Tab inside the dialog', () => {
  render(<Harness />);
  openDialog();
  const first = screen.getByRole('button', { name: 'First' });
  const last = screen.getByRole('button', { name: 'Last' });

  last.focus();
  // fireEvent returns false when the default action was prevented.
  expect(fireEvent.keyDown(last, { key: 'Tab' })).toBe(false);
  expect(first).toHaveFocus();

  expect(fireEvent.keyDown(first, { key: 'Tab', shiftKey: true })).toBe(false);
  expect(last).toHaveFocus();

  // Focus that escaped (for example to the opener) is pulled back in.
  screen.getByRole('button', { name: 'Open' }).focus();
  fireEvent.keyDown(document.body, { key: 'Tab' });
  expect(first).toHaveFocus();
});

it('lets Tab move normally between inner elements', () => {
  render(<Harness />);
  openDialog();
  const first = screen.getByRole('button', { name: 'First' });
  expect(fireEvent.keyDown(first, { key: 'Tab' })).toBe(true);
});

it('closes on Escape and returns focus to the opener', () => {
  render(<Harness />);
  const opener = openDialog();
  fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(opener).toHaveFocus();
});

it('closes on a backdrop click but not on a click inside the dialog', () => {
  render(<Harness />);
  openDialog();
  const dialog = screen.getByRole('dialog');

  fireEvent.mouseDown(dialog);
  fireEvent.mouseDown(screen.getByText('Body text'));
  expect(screen.getByRole('dialog')).toBeInTheDocument();

  fireEvent.mouseDown(dialog.parentElement!);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('ignores Escape and backdrop clicks when not dismissible', () => {
  render(<Harness dismissible={false} />);
  openDialog();
  const dialog = screen.getByRole('dialog');
  fireEvent.keyDown(document.body, { key: 'Escape' });
  fireEvent.mouseDown(dialog.parentElement!);
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});

it('ConfirmDialog describes itself, starts on Cancel and calls the handlers', () => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ConfirmDialog
      title="Delete it?"
      message="This is permanent."
      confirmLabel="Delete"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />,
  );
  expect(screen.getByRole('dialog', { name: 'Delete it?' })).toHaveAccessibleDescription(
    'This is permanent.',
  );
  expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();

  fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  fireEvent.keyDown(document.body, { key: 'Escape' });
  expect(onCancel).toHaveBeenCalledTimes(2);
});

it('ConfirmDialog disables both buttons and ignores Escape while busy', () => {
  const onCancel = vi.fn();
  render(
    <ConfirmDialog
      title="Delete it?"
      message="Sure?"
      busy
      onConfirm={vi.fn()}
      onCancel={onCancel}
    />,
  );
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Working…' })).toBeDisabled();
  fireEvent.keyDown(document.body, { key: 'Escape' });
  expect(onCancel).not.toHaveBeenCalled();
});
