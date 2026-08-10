import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi, publicApi } from '../../services/endpoints';
import { ErrorState } from '../../components/common/States';
import {
  applyCascadeReset,
  backgroundProgrammes,
  browseHelperText,
  classesFor,
  departmentsForProgramme,
  getAcademicLevel,
  hasStreamProgrammes,
  isHigherEd,
  isSchoolBand,
  schoolUploadRequiresStream,
  semestersFor,
  streamProgrammes,
  subjectsFor,
} from '../../utils/taxonomyCascade';

const initialForm = {
  title: '',
  description: '',
  academicLevelId: '',
  programmeId: '',
  departmentId: '',
  semesterId: '',
  classNodeId: '',
  subjectId: '',
  resourceTypeId: '',
  paperTypeId: '',
  status: 'draft',
};

function TaxonomyField({ label, required, value, onChange, options, disabled }) {
  return (
    <label className="block text-sm">
      {label}
      <select
        className="input mt-1"
        required={required}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select...</option>
        {(options || []).map((item) => (
          <option key={item._id} value={item._id}>
            {item.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function AdminUploadPage() {
  const navigate = useNavigate();
  const [taxonomy, setTaxonomy] = useState(null);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [duplicate, setDuplicate] = useState(null);

  const selectedLevel = useMemo(
    () => getAcademicLevel(taxonomy, form.academicLevelId),
    [taxonomy, form.academicLevelId]
  );

  const cascadeOptions = useMemo(() => {
    const levelId = form.academicLevelId;
    if (!taxonomy || !levelId) {
      return { streams: [], programmes: [], departments: [], semesters: [], classes: [], subjects: [] };
    }

    return {
      streams: streamProgrammes(taxonomy, levelId),
      programmes: backgroundProgrammes(taxonomy, levelId),
      departments: form.programmeId ? departmentsForProgramme(taxonomy, form.programmeId) : [],
      semesters: semestersFor(taxonomy, {
        academicLevelId: levelId,
        programmeId: form.programmeId,
        departmentId: form.departmentId,
      }),
      classes: classesFor(taxonomy, {
        academicLevelId: levelId,
        programmeId: form.programmeId,
      }),
      subjects: subjectsFor(taxonomy, {
        academicLevelId: levelId,
        programmeId: form.programmeId,
        departmentId: form.departmentId,
        semesterId: form.semesterId,
        classNodeId: form.classNodeId,
      }),
    };
  }, [taxonomy, form]);

  const showStreams =
    selectedLevel &&
    isSchoolBand(selectedLevel) &&
    hasStreamProgrammes(taxonomy, form.academicLevelId);
  const showClasses =
    selectedLevel &&
    isSchoolBand(selectedLevel) &&
    (!showStreams || form.programmeId);
  const showProgrammes = selectedLevel && isHigherEd(selectedLevel);
  const showDepartments = showProgrammes && form.programmeId;
  const showSemesters = showDepartments && form.departmentId;
  const showSchoolSubjects = showClasses && form.classNodeId;
  const showHigherEdSubjects = showSemesters && form.semesterId;
  const showSubjects = showSchoolSubjects || showHigherEdSubjects;
  const streamRequired = schoolUploadRequiresStream(taxonomy, form.academicLevelId);

  useEffect(() => {
    publicApi.taxonomy().then((res) => setTaxonomy(res.data.data)).catch(() => {});
  }, []);

  function setTaxonomyField(key, value) {
    setForm((current) => applyCascadeReset(current, key, value));
  }

  function validateForm() {
    if (!form.academicLevelId) {
      return 'Academic level is required.';
    }
    if (!form.subjectId) {
      return 'Subject is required.';
    }
    if (!form.resourceTypeId) {
      return 'Resource type is required.';
    }

    if (isSchoolBand(selectedLevel)) {
      if (!form.classNodeId) {
        return 'Class is required for school levels.';
      }
      if (streamRequired && !form.programmeId) {
        return 'Stream is required for this school level.';
      }
      return '';
    }

    if (isHigherEd(selectedLevel)) {
      if (!form.programmeId) {
        return 'Programme is required for UG/PG.';
      }
      if (!form.departmentId) {
        return 'Department is required for UG/PG.';
      }
      if (!form.semesterId) {
        return 'Semester is required for UG/PG.';
      }
      return '';
    }

    return '';
  }

  async function submitUpload({ confirmDuplicate = false } = {}) {
    if (!file) {
      setError('Please choose a PDF file');
      return;
    }
    if (file.type && file.type !== 'application/pdf') {
      setError('Only PDF files are accepted.');
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value) body.append(key, value);
      });
      body.append('file', file);
      if (confirmDuplicate) body.append('confirmDuplicate', 'true');
      await adminApi.upload(body);
      setMessage('Paper saved as draft. Review metadata, then publish from Manage Papers.');
      setFile(null);
      setDuplicate(null);
      setTimeout(() => navigate('/admin/drafts'), 800);
    } catch (err) {
      const code = err.response?.data?.code || err.response?.data?.errorCode;
      const details = err.response?.data?.errors || err.response?.data?.details;
      if (err.response?.status === 409 || code === 'DUPLICATE_SUSPECT') {
        setDuplicate({
          message: err.response?.data?.message || 'Similar paper already exists.',
          existing: details?.[0]?.existingPaper || null,
        });
        setError('');
      } else {
        setError(err.response?.data?.message || err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    await submitUpload({ confirmDuplicate: false });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Upload paper</h1>
        <p className="mt-1 text-sm text-ink-700/70 dark:text-sand-100/70">
          PDF only. Uploads start as drafts until you publish. {browseHelperText(selectedLevel)}
        </p>
      </div>

      {error && <ErrorState message={error} />}
      {message && <p className="panel text-moss-500">{message}</p>}

      {duplicate ? (
        <div className="panel space-y-3 border-amber-500/40">
          <p className="font-semibold">Similar paper already exists.</p>
          <p className="text-sm">{duplicate.message}</p>
          {duplicate.existing ? (
            <p className="text-sm text-ink-700/70">
              Existing: {duplicate.existing.title} ({duplicate.existing.status})
            </p>
          ) : null}
          <p className="text-sm">A duplicate PDF may legitimately use different metadata. Continue?</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={() => setDuplicate(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={loading}
              onClick={() => submitUpload({ confirmDuplicate: true })}
            >
              Continue upload
            </button>
          </div>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="panel grid gap-4 md:grid-cols-2">
        <label className="block text-sm md:col-span-2">
          Title
          <input
            className="input mt-1"
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </label>
        <label className="block text-sm md:col-span-2">
          Description
          <textarea
            className="input mt-1"
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </label>

        <TaxonomyField
          label="Academic Level"
          required
          value={form.academicLevelId}
          onChange={(value) => setTaxonomyField('academicLevelId', value)}
          options={taxonomy?.academicLevels}
        />

        {showStreams ? (
          <TaxonomyField
            label="Stream"
            required={streamRequired}
            value={form.programmeId}
            onChange={(value) => setTaxonomyField('programmeId', value)}
            options={cascadeOptions.streams}
          />
        ) : null}

        {showProgrammes ? (
          <TaxonomyField
            label="Programme / Background"
            required
            value={form.programmeId}
            onChange={(value) => setTaxonomyField('programmeId', value)}
            options={cascadeOptions.programmes}
          />
        ) : null}

        {showDepartments ? (
          <TaxonomyField
            label="Department"
            required
            value={form.departmentId}
            onChange={(value) => setTaxonomyField('departmentId', value)}
            options={cascadeOptions.departments}
          />
        ) : null}

        {showSemesters ? (
          <TaxonomyField
            label="Semester"
            required
            value={form.semesterId}
            onChange={(value) => setTaxonomyField('semesterId', value)}
            options={cascadeOptions.semesters}
          />
        ) : null}

        {showClasses ? (
          <TaxonomyField
            label="Class"
            required
            value={form.classNodeId}
            onChange={(value) => setTaxonomyField('classNodeId', value)}
            options={cascadeOptions.classes}
          />
        ) : null}

        {showSubjects ? (
          <TaxonomyField
            label="Subject"
            required
            value={form.subjectId}
            onChange={(value) => setTaxonomyField('subjectId', value)}
            options={cascadeOptions.subjects}
          />
        ) : null}

        {form.academicLevelId ? (
          <>
            <TaxonomyField
              label="Examination Type (optional)"
              required={false}
              value={form.paperTypeId}
              onChange={(value) => setForm((f) => ({ ...f, paperTypeId: value }))}
              options={taxonomy?.paperTypes}
            />
            <TaxonomyField
              label="Resource Type"
              required
              value={form.resourceTypeId}
              onChange={(value) => setForm((f) => ({ ...f, resourceTypeId: value }))}
              options={taxonomy?.resourceTypes}
            />
          </>
        ) : null}

        <label className="block text-sm md:col-span-2">
          PDF file
          <input
            className="input mt-1"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>

        <button className="btn-primary md:col-span-2" disabled={loading || !form.academicLevelId} type="submit">
          {loading ? 'Uploading...' : 'Save as draft'}
        </button>
      </form>
    </div>
  );
}
