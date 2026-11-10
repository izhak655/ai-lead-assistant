import { normalizePhone } from '../src/domain/phone';

describe('normalizePhone', () => {
  it('turns a local Israeli mobile into E.164', () => {
    expect(normalizePhone('052-111-0001')).toBe('+972521110001');
  });

  it('keeps an existing international number', () => {
    expect(normalizePhone('+972 52 111 0001')).toBe('+972521110001');
  });

  it('adds a plus when the country code is already present', () => {
    expect(normalizePhone('972521110001')).toBe('+972521110001');
  });

  it('rejects numbers that are too short', () => {
    expect(normalizePhone('123')).toBeNull();
    expect(normalizePhone('')).toBeNull();
  });
});
