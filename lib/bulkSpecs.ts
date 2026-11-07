import type { BulkSpec } from '@/components/admin/BulkImport';
import { parseFlexibleDate } from '@/lib/dates';

const HINT = 'Download the template, fill one row per item, then upload it. Column order doesn\'t matter and header names are matched loosely. A preview shows any problems before anything is saved.';

export const jobsSpec: BulkSpec = {
  title: 'Jobs', noun: 'job', table: 'jobs', hint: HINT,
  aliases: {
    title: ['jobtitle', 'title', 'position', 'role'],
    company: ['company', 'companyname', 'employer'],
    location: ['location', 'city', 'state'],
    type: ['jobtype', 'type', 'employmenttype'],
    salary: ['salary', 'pay', 'compensation'],
    experienceLevel: ['experiencelevel', 'experience', 'seniority'],
    requirements: ['requirements', 'requirement', 'qualifications'],
    description: ['description', 'jobdescription', 'summary', 'details'],
    deadline: ['applicationdeadline', 'deadline', 'closingdate'],
    postedDate: ['posteddate', 'dateposted', 'posted'],
    applyUrl: ['applybutton', 'applylink', 'applyurl', 'applicationlink', 'link', 'url'],
    category: ['category', 'field', 'industry'],
  },
  required: [{ field: 'title', label: 'Job Title' }, { field: 'company', label: 'Company' }],
  validate: (r) => {
    const errors: string[] = [], warnings: string[] = [];
    const g = (k: string) => (r[k] ?? '').trim();
    let deadline = g('deadline'), posted = g('postedDate');
    if (!g('title')) errors.push('Missing Job Title');
    if (!g('company')) errors.push('Missing Company');
    if (!g('applyUrl')) errors.push('Missing Apply Link');
    if (deadline && !parseFlexibleDate(deadline)) { warnings.push(`Deadline "${deadline}" wasn't recognised — imported without a deadline`); deadline = ''; }
    if (posted && !parseFlexibleDate(posted)) { warnings.push(`Posted date "${posted}" wasn't recognised — imported without one`); posted = ''; }
    return {
      errors, warnings, label: `${g('title')} — ${g('company')}`,
      row: {
        title: g('title'), company: g('company'), location: g('location'), salary: g('salary'),
        type: g('type') || 'Full-time', experience_level: g('experienceLevel'),
        deadline, posted_date: posted ? parseFlexibleDate(posted)?.toISOString().slice(0, 10) : null,
        logo: '💼', category: g('category') || 'General', apply_url: g('applyUrl'),
        description: g('description'), requirements: g('requirements'),
      },
    };
  },
  templateFile: 'naijatoday_jobs_template.csv',
  templateRows: [
    ['Job Title', 'Company', 'Location', 'Job Type', 'Salary', 'Experience Level', 'Requirements', 'Description', 'Application Deadline', 'Posted Date', 'Apply Link', 'Category'],
    ['Warehouse Supervisor', 'Acme Logistics Ltd', 'Lagos, Nigeria', 'Full-time', '₦250,000/month', '3-5 years', 'B.Sc in Logistics; 3+ years warehouse experience', 'Oversee daily warehouse operations and staff.', 'July 30, 2026', '2026-07-04', 'https://example.com/apply', 'Logistics'],
  ],
};

export const scholarshipsSpec: BulkSpec = {
  title: 'Scholarships', noun: 'scholarship', table: 'scholarships', hint: HINT,
  aliases: {
    title: ['scholarshiptitle', 'title', 'name'],
    provider: ['provider', 'sponsor', 'organization', 'organisation', 'institution'],
    country: ['country', 'location'],
    level: ['level', 'degreelevel', 'studylevel'],
    field: ['field', 'fieldofstudy', 'discipline', 'coursearea'],
    fully: ['fullyfunded', 'fully', 'funding'],
    deadline: ['applicationdeadline', 'deadline', 'closingdate'],
    applyUrl: ['applylink', 'applybutton', 'applyurl', 'applicationlink', 'link', 'url'],
  },
  required: [{ field: 'title', label: 'Scholarship Title' }, { field: 'provider', label: 'Provider' }],
  validate: (r) => {
    const errors: string[] = [], warnings: string[] = [];
    const g = (k: string) => (r[k] ?? '').trim();
    let deadline = g('deadline');
    if (!g('title')) errors.push('Missing Scholarship Title');
    if (!g('provider')) errors.push('Missing Provider');
    if (!g('applyUrl')) errors.push('Missing Apply Link');
    if (deadline && !parseFlexibleDate(deadline)) { warnings.push(`Deadline "${deadline}" wasn't recognised — imported without a deadline`); deadline = ''; }
    return {
      errors, warnings, label: `${g('title')} — ${g('provider')}`,
      row: {
        title: g('title'), provider: g('provider'), deadline, country: g('country'),
        fully: ['yes', 'true', 'fully funded', 'fully-funded', 'full', '1'].includes(g('fully').toLowerCase()),
        level: g('level') || 'Masters', field: g('field'), apply_url: g('applyUrl'),
      },
    };
  },
  templateFile: 'naijatoday_scholarships_template.csv',
  templateRows: [
    ['Scholarship Title', 'Provider', 'Country', 'Level', 'Field', 'Fully Funded', 'Application Deadline', 'Apply Link'],
    ['Chevening Scholarship', 'UK Government', 'United Kingdom', 'Masters', 'Any Field', 'Yes', 'November 3, 2026', 'https://example.com/apply'],
  ],
};

export const fixturesSpec: BulkSpec = {
  title: 'Fixtures', noun: 'fixture', table: 'fixtures', hint: HINT,
  aliases: {
    competition: ['competition', 'league', 'tournament'],
    home_team: ['hometeam', 'home', 'team1', 'hometeamname'],
    away_team: ['awayteam', 'away', 'team2', 'awayteamname'],
    kickoff_display: ['kickoff', 'kickofftime', 'time', 'matchtime', 'kickoffdisplay', 'date'],
    home_score: ['homescore', 'score1', 'homegoals'],
    away_score: ['awayscore', 'score2', 'awaygoals'],
    status: ['status', 'matchstatus'],
  },
  required: [{ field: 'home_team', label: 'Home Team' }, { field: 'away_team', label: 'Away Team' }],
  validate: (r) => {
    const errors: string[] = [], warnings: string[] = [];
    const g = (k: string) => (r[k] ?? '').trim();
    let status = g('status').toLowerCase();
    let competition = g('competition');
    if (!g('home_team')) errors.push('Missing Home Team');
    if (!g('away_team')) errors.push('Missing Away Team');
    if (!competition) { competition = 'Football'; warnings.push("No competition given — defaulted to 'Football'"); }
    if (!['upcoming', 'live', 'finished'].includes(status)) {
      if (status) warnings.push(`Status "${g('status')}" not recognised — defaulted to 'upcoming'`);
      status = 'upcoming';
    }
    const score = (v: string) => (v === '' ? null : Number.isFinite(parseInt(v, 10)) ? parseInt(v, 10) : null);
    return {
      errors, warnings, label: `${g('home_team')} vs ${g('away_team')}`,
      row: {
        competition, home_team: g('home_team'), away_team: g('away_team'), kickoff_display: g('kickoff_display'),
        home_score: score(g('home_score')), away_score: score(g('away_score')), status, active: true,
      },
    };
  },
  templateFile: 'naijatoday_fixtures_template.csv',
  templateRows: [
    ['Competition', 'Home Team', 'Away Team', 'Kickoff Time', 'Home Score', 'Away Score', 'Status'],
    ['Premier League', 'Manchester United', 'Arsenal', 'Sat, 4:30 PM WAT', '', '', 'upcoming'],
    ['World Cup', 'Spain', 'France', 'Full Time', '2', '0', 'finished'],
  ],
};
