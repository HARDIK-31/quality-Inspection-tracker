import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateInspection } from '../hooks/useInspections';
import { Button, ErrorState, Field, Input, Select, Textarea } from '../components/ui';
import { DEFECT_TYPE_LABELS, SEVERITY_LABELS } from '../lib/labels';
import { todayISO } from '../lib/format';
import { DEFECT_TYPES, SEVERITIES } from '../lib/types';

const formSchema = z.object({
  inspectionDate: z
    .string()
    .min(1, 'Pick the date the defect was found')
    .refine((value) => value <= todayISO(), 'The date cannot be in the future'),
  machineId: z
    .string()
    .trim()
    .min(1, 'Enter the machine or line ID')
    .max(64, 'Keep this under 64 characters'),
  defectType: z.enum(DEFECT_TYPES),
  severity: z.enum(SEVERITIES),
  remarks: z.string().trim().max(500, 'Keep remarks under 500 characters'),
});

type FormValues = z.infer<typeof formSchema>;

export function NewInspectionPage() {
  const navigate = useNavigate();
  const createInspection = useCreateInspection();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      inspectionDate: todayISO(),
      machineId: '',
      defectType: 'WEAVE_DEFECT',
      severity: 'MAJOR',
      remarks: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await createInspection.mutateAsync({
        inspectionDate: values.inspectionDate,
        machineId: values.machineId,
        defectType: values.defectType,
        severity: values.severity,
        remarks: values.remarks.trim() === '' ? null : values.remarks.trim(),
      });
      navigate('/', { replace: true });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not save the inspection.');
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Log an inspection</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Record what you found on the floor. Fields marked * are required.
        </p>
      </div>

      {submitError && <ErrorState message={submitError} />}

      <Field
        label="Date found"
        htmlFor="inspectionDate"
        required
        error={errors.inspectionDate?.message}
      >
        <Input
          id="inspectionDate"
          type="date"
          max={todayISO()}
          invalid={Boolean(errors.inspectionDate)}
          {...register('inspectionDate')}
        />
      </Field>

      <Field
        label="Machine / line ID"
        htmlFor="machineId"
        required
        error={errors.machineId?.message}
        hint="e.g. LOOM-14. Saved in uppercase."
      >
        <Input
          id="machineId"
          placeholder="LOOM-14"
          autoCapitalize="characters"
          autoComplete="off"
          enterKeyHint="next"
          invalid={Boolean(errors.machineId)}
          {...register('machineId')}
        />
      </Field>

      <Field label="Defect type" htmlFor="defectType" required error={errors.defectType?.message}>
        <Select id="defectType" invalid={Boolean(errors.defectType)} {...register('defectType')}>
          {DEFECT_TYPES.map((type) => (
            <option key={type} value={type}>
              {DEFECT_TYPE_LABELS[type]}
            </option>
          ))}
        </Select>
      </Field>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium text-slate-700">
          Severity<span className="ml-0.5 text-rose-600">*</span>
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {SEVERITIES.map((severity) => (
            <label
              key={severity}
              className="relative flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-white text-sm font-semibold text-slate-600 ring-1 ring-slate-300 has-checked:bg-slate-900 has-checked:text-white has-checked:ring-slate-900"
            >
              <input type="radio" value={severity} className="sr-only" {...register('severity')} />
              {SEVERITY_LABELS[severity]}
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="Remarks" htmlFor="remarks" error={errors.remarks?.message} hint="Optional">
        <Textarea
          id="remarks"
          rows={3}
          placeholder="What did you see? Where on the roll?"
          invalid={Boolean(errors.remarks)}
          {...register('remarks')}
        />
      </Field>

      <div className="mt-2 flex gap-3">
        <Button type="button" variant="secondary" fullWidth onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <Button type="submit" fullWidth disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save inspection'}
        </Button>
      </div>
    </form>
  );
}
