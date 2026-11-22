import { describe, expect, it } from '@jest/globals';
import { ApiError } from '@/types/auth';
import {
  buildDoctorFilterQuery, errorMessage, formatFee, formatLanguages,
  normalizeSpecializationName, removeStaleSpecialty, roleName, schedulesOverlap,
} from '@/utils/domain';

describe('domain utilities', () => {
  it('normalizes role names', () => {
    expect(roleName('DOCTOR')).toBe('doctor');
    expect(roleName('Assistant')).toBe('assistant');
  });

  it('formats fee and language values', () => {
    expect(formatFee('125.5')).toBe('125.50');
    expect(formatFee(null)).toBe('Not listed');
    expect(formatLanguages(['English', 'Bengali'])).toBe('English, Bengali');
  });

  it('normalizes API permission errors', () => {
    const error = new ApiError(403, { detail: 'Forbidden' });
    expect(errorMessage(error)).toBe('You do not have permission to perform this action.');
  });

  it('normalizes validation field errors', () => {
    const error = new ApiError(400, { address: ['This field is required.'] });
    expect(errorMessage(error)).toBe('address: This field is required.');
  });

  it('does not expose backend HTML errors', () => {
    const error = new ApiError(500, { detail: '<!DOCTYPE html><html><body>Internal Server Error</body></html>' });
    expect(errorMessage(error)).toBe('The server encountered an error. Please try again.');
  });

  it('normalizes duplicate schedule errors', () => {
    const error = new ApiError(400, { non_field_errors: ['The schedule fields chamber, weekday must make a unique set.'] });
    expect(errorMessage(error)).toBe('This schedule already exists for the selected chamber and weekday.');
  });

  it('detects overlapping schedules while allowing adjacent times', () => {
    expect(schedulesOverlap('09:00', '12:00', '11:30', '17:00')).toBe(true);
    expect(schedulesOverlap('09:00', '12:00', '12:00', '17:00')).toBe(false);
  });

  it('builds only active doctor filter query parameters', () => {
    expect(buildDoctorFilterQuery({
      search: 'heart',
      specialty: 'Cardiology',
      hospitalId: 'hospital-123',
      page: 2,
      experienceYears: undefined,
    })).toBe('search=heart&page=2&specialization=Cardiology&hospital=hospital-123');
  });

  it('removes cleared filter parameters', () => {
    expect(buildDoctorFilterQuery({ specialty: '', hospitalId: undefined })).toBe('');
  });

  it('builds repeated specialization and hospital filters', () => {
    expect(buildDoctorFilterQuery({
      search: 'heart',
      specializations: ['Cardiology', 'Neurology'],
      hospitalIds: ['hospital-1', 'hospital-2'],
      page: 2,
    })).toBe('search=heart&page=2&specialization=Cardiology%2CNeurology&hospital=hospital-1%2Chospital-2');
  });

  it('normalizes specialization objects and strings', () => {
    expect(normalizeSpecializationName('Cardiology')).toBe('Cardiology');
    expect(normalizeSpecializationName({ id: 'Cardiology', name: 'Cardiology' })).toBe('Cardiology');
  });

  it('clears a stale specialty selection', () => {
    expect(removeStaleSpecialty('Cardiology', ['Dermatology'])).toBe('');
  });
});
