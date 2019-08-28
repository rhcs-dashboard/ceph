import { HealthColorPipe } from './health-color.pipe';

describe('HealthColorPipe', () => {
  const pipe = new HealthColorPipe();

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('transforms "HEALTH_OK"', () => {
    expect(pipe.transform('HEALTH_OK')).toEqual({ color: '#6ca100' });
  });

  it('transforms "HEALTH_WARN"', () => {
    expect(pipe.transform('HEALTH_WARN')).toEqual({ color: '#f0ab00' });
  });

  it('transforms "HEALTH_ERR"', () => {
    expect(pipe.transform('HEALTH_ERR')).toEqual({ color: '#c9190b' });
  });

  it('transforms others', () => {
    expect(pipe.transform('abc')).toBe(null);
  });
});
