import { describe, it, expect } from 'vitest';
import {
  parseSemver,
  incrementSemver,
  maxBump,
  classifyCommit,
  resolveLabelBump,
  formatReleaseMarkdown,
  analyzeRelease,
  prependChangelogEntry,
  updateReadmeVersionBadge,
} from '../src/release/semver.js';

describe('Semantic Release Engine', () => {
  it('parses valid semver and rejects invalid format', () => {
    expect(parseSemver('v1.1.0')).toEqual({ major: 1, minor: 1, patch: 0 });
    expect(parseSemver('1.2.3')).toEqual({ major: 1, minor: 2, patch: 3 });
    expect(() => parseSemver('invalid')).toThrow(/Invalid semantic version/);
  });

  it('increments semver correctly', () => {
    expect(incrementSemver('1.1.0', 'major')).toBe('2.0.0');
    expect(incrementSemver('1.1.0', 'minor')).toBe('1.2.0');
    expect(incrementSemver('1.1.0', 'patch')).toBe('1.1.1');
    expect(incrementSemver('1.1.0', 'none')).toBe('1.1.0');
  });

  it('calculates maxBump precedence', () => {
    expect(maxBump('none', 'patch')).toBe('patch');
    expect(maxBump('patch', 'minor')).toBe('minor');
    expect(maxBump('minor', 'major')).toBe('major');
    expect(maxBump('major', 'patch')).toBe('major');
  });

  it('classifies conventional commits properly', () => {
    const feat = classifyCommit({ sha: '123', subject: 'feat(search): add species filter' });
    expect(feat.bump).toBe('minor');
    expect(feat.type).toBe('feat');

    const fix = classifyCommit({ sha: '456', subject: 'fix(http): handle cors headers' });
    expect(fix.bump).toBe('patch');
    expect(fix.type).toBe('fix');

    const breaking = classifyCommit({ sha: '789', subject: 'feat!: overhaul tool names' });
    expect(breaking.bump).toBe('major');
    expect(breaking.breaking).toBe(true);

    const chore = classifyCommit({ sha: '101', subject: 'docs: update readme' });
    expect(chore.bump).toBe('none');

    const skipCi = classifyCommit({ sha: '102', subject: 'chore(release): v1.1.0 [skip ci]' });
    expect(skipCi.bump).toBe('none');
    expect(skipCi.type).toBe('release');
  });

  it('resolves PR label bump overrides', () => {
    expect(resolveLabelBump(['semver:major'])).toEqual({ bump: 'major', forcedSkip: false });
    expect(resolveLabelBump(['semver:minor'])).toEqual({ bump: 'minor', forcedSkip: false });
    expect(resolveLabelBump(['semver:patch'])).toEqual({ bump: 'patch', forcedSkip: false });
    expect(resolveLabelBump(['semver:skip'])).toEqual({ bump: 'none', forcedSkip: true });
    expect(resolveLabelBump(['other'])).toEqual({ bump: 'none', forcedSkip: false });
  });

  it('analyzes commits and computes next release', () => {
    const analysis = analyzeRelease({
      currentVersion: '1.1.0',
      dateStr: '2026-11-11',
      commits: [
        { sha: 'aaa', subject: 'feat(helper): add hotspot search' },
        { sha: 'bbb', subject: 'fix: validate coordinates' },
      ],
    });

    expect(analysis.shouldRelease).toBe(true);
    expect(analysis.bumpType).toBe('minor');
    expect(analysis.nextVersion).toBe('1.2.0');
    expect(analysis.nextTag).toBe('v1.2.0');
    expect(analysis.releaseNotes).toContain('ebird-mcp v1.2.0');
    expect(analysis.releaseNotes).toContain('add hotspot search');
  });

  it('prepends changelog entry without duplicating', () => {
    const initial = '# Changelog\n\n## [1.0.0] - 2026-08-19\n- initial\n';
    const updated = prependChangelogEntry(
      initial,
      '## [1.1.0] - 2026-11-11\n- new tools\n',
      '1.1.0',
    );

    expect(updated).toContain('## [1.1.0] - 2026-11-11');
    expect(updated).toContain('## [1.0.0] - 2026-08-19');

    // Idempotent
    const duplicate = prependChangelogEntry(
      updated,
      '## [1.1.0] - 2026-11-11\n- new tools\n',
      '1.1.0',
    );
    expect(duplicate).toBe(updated);
  });

  it('updates version badge in README', () => {
    const readme =
      '[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](package.json)';
    const updated = updateReadmeVersionBadge(readme, '1.2.0');
    expect(updated).toBe(
      '[![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)](package.json)',
    );
  });
});
