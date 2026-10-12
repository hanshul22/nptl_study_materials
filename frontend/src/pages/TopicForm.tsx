import { useId, useState, type ChangeEvent, type FormEvent } from 'react';
import { TopicCreate, type Topic } from '@study/shared';
import { ApiClientError, useCreateTopic, useUpdateTopic } from '../api';
import { Dialog, toastMessageFromError, useToast } from '../components';

type Field = 'name' | 'description';
type FormErrors = Partial<Record<Field | 'form', string>>;

const LABELS: Record<Field, string> = { name: 'Name', description: 'Description' };
const GENERIC_FORM_ERROR =
  'The server could not accept these values. Check the form and try again.';

const isField = (value: unknown): value is Field => value === 'name' || value === 'description';

/** Maps zod issues from the shared TopicCreate schema to one message per field. */
function clientErrors(
  issues: readonly { path: readonly PropertyKey[]; code: string; maximum?: unknown }[],
) {
  const errors: FormErrors = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if (!isField(field) || errors[field]) continue;
    errors[field] =
      issue.code === 'too_big'
        ? `${LABELS[field]} must be ${String(issue.maximum)} characters or fewer`
        : `${LABELS[field]} is required`;
  }
  return errors;
}

/** Inline errors for a failed request, or null when the failure belongs in a toast. */
function serverErrors(err: unknown): FormErrors | null {
  if (!(err instanceof ApiClientError)) return null;
  if (err.code === 'DUPLICATE_TOPIC') return { name: 'A topic with this name already exists' };
  if (err.code !== 'VALIDATION_ERROR') return null;

  const errors: FormErrors = {};
  let unmapped = !err.details?.length;
  for (const { path, message } of err.details ?? []) {
    const field = path[0];
    if (isField(field)) errors[field] ??= message;
    else unmapped = true;
  }
  if (unmapped) errors.form = GENERIC_FORM_ERROR;
  return errors;
}

interface TopicFormProps {
  /** Present = rename (fields prefilled); absent = create. */
  topic?: Topic;
  onClose: () => void;
}

const inputClass =
  'mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600 aria-[invalid=true]:border-red-600';
const buttonClass =
  'rounded-md px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-60';

/** Create / rename dialog. Stays open on any error; closes only after a successful save. */
export function TopicForm({ topic, onClose }: TopicFormProps) {
  const create = useCreateTopic();
  const update = useUpdateTopic();
  const { toast } = useToast();
  const [name, setName] = useState(topic?.name ?? '');
  const [description, setDescription] = useState(topic?.description ?? '');
  const [errors, setErrors] = useState<FormErrors>({});
  const baseId = useId();
  const busy = create.isPending || update.isPending;

  /** Change handler that also clears that field's error. */
  const edit =
    (field: Field, setValue: (value: string) => void) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValue(e.target.value);
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = TopicCreate.safeParse({ name, description });
    if (!parsed.success) {
      setErrors(clientErrors(parsed.error.issues));
      return;
    }
    setErrors({});
    // The schema trims both values; '' means "no description".
    const { name: cleanName, description: cleanDescription = '' } = parsed.data;

    try {
      if (topic) {
        // Rename sends '' to clear the description (D-025).
        await update.mutateAsync({
          id: topic.id,
          body: { name: cleanName, description: cleanDescription },
        });
        toast({ kind: 'success', message: `Renamed "${cleanName}"` });
      } else {
        // Create omits an empty description (never '' or null).
        await create.mutateAsync(
          cleanDescription
            ? { name: cleanName, description: cleanDescription }
            : { name: cleanName },
        );
        toast({ kind: 'success', message: `Created "${cleanName}"` });
      }
      onClose();
    } catch (err) {
      const inline = serverErrors(err);
      if (inline) setErrors(inline);
      else toast({ kind: 'error', message: toastMessageFromError(err) });
    }
  }

  const fieldProps = (field: Field) => ({
    id: `${baseId}-${field}`,
    'aria-invalid': errors[field] ? (true as const) : undefined,
    'aria-describedby': errors[field] ? `${baseId}-${field}-error` : undefined,
  });
  const fieldError = (field: Field) =>
    errors[field] && (
      <p id={`${baseId}-${field}-error`} role="alert" className="mt-1 text-sm text-red-700">
        {errors[field]}
      </p>
    );

  return (
    <Dialog title={topic ? 'Rename topic' : 'New topic'} onClose={onClose} dismissible={!busy}>
      <form noValidate onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-4">
        {errors.form && (
          <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
            {errors.form}
          </p>
        )}
        <div>
          <label htmlFor={`${baseId}-name`} className="block text-sm font-medium text-slate-800">
            Name
          </label>
          <input
            {...fieldProps('name')}
            type="text"
            autoFocus
            aria-required="true"
            value={name}
            onChange={edit('name', setName)}
            className={inputClass}
          />
          {fieldError('name')}
        </div>
        <div>
          <label
            htmlFor={`${baseId}-description`}
            className="block text-sm font-medium text-slate-800"
          >
            Description (optional)
          </label>
          <textarea
            {...fieldProps('description')}
            rows={3}
            value={description}
            onChange={edit('description', setDescription)}
            className={inputClass}
          />
          {fieldError('description')}
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className={`${buttonClass} border border-slate-300 bg-white text-slate-800 hover:bg-slate-50`}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className={`${buttonClass} bg-indigo-600 text-white hover:bg-indigo-700`}
          >
            {busy ? 'Saving…' : topic ? 'Save changes' : 'Create topic'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
