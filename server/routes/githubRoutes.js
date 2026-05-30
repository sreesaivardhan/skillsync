// GitHub integration routes — fetch public repos and suggest skills
import express from 'express';
import User from '../models/User.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Maps GitHub language names → SkillSync skill names
const languageMap = {
  JavaScript:  'JavaScript',
  TypeScript:  'TypeScript',
  Python:      'Python',
  Java:        'Java',
  'C++':       'C++',
  'C#':        'C#',
  C:           'C',
  Go:          'Go',
  Rust:        'Rust',
  PHP:         'PHP',
  Ruby:        'Ruby',
  Kotlin:      'Kotlin',
  Swift:       'Swift',
  HTML:        'Frontend',
  CSS:         'Frontend',
  Dart:        'Flutter',
  Shell:       'Shell Scripting',
  SQL:         'SQL',
};

// ── Helper: authenticated GitHub API GET ──────────────────────────────────────
async function githubGet(url) {
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'SkillSync',
    },
  });
  if (!res.ok) throw new Error(`GitHub API failed: ${res.status}`);
  return res.json();
}

// ── POST /api/github/connect ──────────────────────────────────────────────────
// Fetches user profile + repos, computes suggested skills, saves to DB
router.post('/connect', authMiddleware, async (req, res) => {
  try {
    const { githubUsername } = req.body;
    if (!githubUsername?.trim()) {
      return res.status(400).json({ message: 'GitHub username is required.' });
    }

    // Fetch GitHub profile (validates username exists)
    const profile = await githubGet(`https://api.github.com/users/${githubUsername.trim()}`);

    // Fetch up to 100 most recently updated repos
    const repos = await githubGet(
      `https://api.github.com/users/${githubUsername.trim()}/repos?per_page=100&sort=updated`
    );

    // Exclude forks and archived repos
    const filteredRepos = repos.filter((r) => !r.fork && !r.archived);

    // Aggregate language byte counts across all repos
    const languageTotals = {};
    await Promise.allSettled(
      filteredRepos.map(async (repo) => {
        try {
          const langs = await githubGet(repo.languages_url);
          for (const [lang, bytes] of Object.entries(langs)) {
            languageTotals[lang] = (languageTotals[lang] || 0) + bytes;
          }
        } catch (_) {
          // Ignore individual repo failures (private, empty, etc.)
        }
      })
    );

    // Sort by byte count, map to skill names, deduplicate, take top 6
    const suggestedSkills = Object.entries(languageTotals)
      .sort(([, a], [, b]) => b - a)
      .map(([lang]) => languageMap[lang])
      .filter(Boolean)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .slice(0, 6);

    // Save GitHub data to user document
    const user = await User.findById(req.user.id);
    user.githubId        = String(profile.id);
    user.githubUsername  = profile.login;
    user.githubConnected = true;
    user.githubRepos     = filteredRepos.slice(0, 12).map((r) => ({
      name:        r.name,
      html_url:    r.html_url,
      description: r.description,
      language:    r.language,
    }));
    await user.save();

    return res.json({
      githubUsername:  user.githubUsername,
      repos:           user.githubRepos,
      suggestedSkills,
    });
  } catch (err) {
    console.error('GitHub connect error:', err);
    if (err.message?.includes('GitHub API failed: 404')) {
      return res.status(404).json({ message: 'GitHub user not found. Check the username.' });
    }
    return res.status(500).json({ message: 'Failed to fetch GitHub data.' });
  }
});

// ── PATCH /api/github/apply-skills ───────────────────────────────────────────
// Merges suggested skills into user.skillsOffered (no duplicates)
router.patch('/apply-skills', authMiddleware, async (req, res) => {
  try {
    const { skills } = req.body;
    const user = await User.findById(req.user.id);
    const existingSkills = (user.skillsOffered || []).map((s) => s.skill?.toLowerCase());

    const merged = [...(user.skillsOffered || [])];
    for (const skill of skills || []) {
      if (!existingSkills.includes(skill.toLowerCase())) {
        merged.push({ skill, level: 'Intermediate' });
      }
    }

    user.skillsOffered = merged;
    await user.save();

    return res.json({
      message: 'GitHub skills imported successfully.',
      user,
    });
  } catch (err) {
    console.error('Apply GitHub skills error:', err);
    return res.status(500).json({ message: 'Failed to save GitHub skills.' });
  }
});

export default router;
