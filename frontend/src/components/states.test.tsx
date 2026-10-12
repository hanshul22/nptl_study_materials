import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { EmptyState } from './EmptyState';
import { LoadingState } from './LoadingState';
import { Skeleton } from './Skeleton';

it('EmptyState renders title, description and action', () => {
  render(
    <EmptyState
      title="No topics yet"
      description="Create one to get started."
      action={<button type="button">New topic</button>}
    />,
  );
  expect(screen.getByRole('heading', { name: 'No topics yet' })).toBeInTheDocument();
  expect(screen.getByText('Create one to get started.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'New topic' })).toBeInTheDocument();
});

it('EmptyState works with only a title', () => {
  render(<EmptyState title="Nothing here" />);
  expect(screen.getByRole('heading', { name: 'Nothing here' })).toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

it('LoadingState exposes a status with hidden "Loading" text', () => {
  render(<LoadingState />);
  expect(screen.getByRole('status')).toHaveTextContent('Loading');
});

it('Skeleton is hidden from assistive tech and accepts a className', () => {
  const { container } = render(<Skeleton className="h-4 w-10" />);
  const block = container.firstElementChild;
  expect(block).toHaveAttribute('aria-hidden', 'true');
  expect(block).toHaveClass('animate-pulse', 'h-4', 'w-10');
});
