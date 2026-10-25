import { DEFAULT_SETTINGS, parseSettings } from '../settings';

describe('parseSettings theme', () => {
  it('defaults to System with the Midnight dark style', () => {
    expect(parseSettings({})).toMatchObject({ theme: 'system', darkStyle: 'midnight' });
    expect(DEFAULT_SETTINGS.darkStyle).toBe('midnight');
  });

  it('migrates the old "midnight" theme to Dark + Midnight', () => {
    expect(parseSettings({ theme: 'midnight' })).toMatchObject({ theme: 'dark', darkStyle: 'midnight' });
  });

  it('keeps a chosen dark style', () => {
    expect(parseSettings({ theme: 'dark', darkStyle: 'black' })).toMatchObject({ theme: 'dark', darkStyle: 'black' });
    expect(parseSettings({ theme: 'nope', darkStyle: 'nope' })).toMatchObject({ theme: 'system', darkStyle: 'midnight' });
  });
});

describe('parseSettings onboarding', () => {
  it('is unseen until stored as true', () => {
    expect(parseSettings({}).onboardingSeen).toBe(false);
    expect(parseSettings({ onboardingSeen: 'false' }).onboardingSeen).toBe(false);
    expect(parseSettings({ onboardingSeen: 'true' }).onboardingSeen).toBe(true);
  });
});
