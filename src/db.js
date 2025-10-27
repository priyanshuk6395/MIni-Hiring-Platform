import Dexie from 'dexie';

export const db = new Dexie('TalentFlowDB');
db.version(1).stores({
  jobs: '++id, &slug, title, status, order, createdAt',
  candidates:
    '++id, &email, name, stage, jobId, createdAt, [jobId+stage]',
  assessments: '&jobId, title, sections', // &jobId makes it the primary key
  assessmentResponses: '++id, candidateId, jobId, createdAt',
});

// --- CONSTANTS ---
export const CANDIDATE_STAGES = [
  { id: 'applied', title: 'Applied' },
  { id: 'screen', title: 'Screen' },
  { id: 'tech', title: 'Tech Interview' },
  { id: 'offer', title: 'Offer' },
  { id: 'hired', title: 'Hired' },
  { id: 'rejected', title: 'Rejected' },
];
export const STAGE_IDS = CANDIDATE_STAGES.map((s) => s.id);

export const QUESTION_TYPES = [
  { id: 'short-text', name: 'Short Text' },
  { id: 'long-text', name: 'Long Text' },
  { id: 'single-choice', name: 'Single Choice' },
  { id: 'multi-choice', name: 'Multiple Choice' },
  { id: 'numeric', name: 'Numeric' },
  { id: 'file', name: 'File Upload' },
];

// --- SEED DATA ---

// Helper for random data
const a = (arr) => arr[Math.floor(Math.random() * arr.length)];
const r = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Simple slugify
const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text

// Random name generator
const firstNames = [
  'Aarav', 'Vihaan', 'Rohan', 'Arjun', 'Kabir', 'Ishaan', 'Advik', 'Veer', 'Aanya', 'Diya', 
  'Shanaya', 'Myra', 'Ananya', 'Saanvi', 'Kiara', 'Navya', 'Riya', 'Siya', 'Tara', 'Anika',
];
const lastNames = [
  'Singh', 'Kumar', 'Patel', 'Shah', 'Sharma', 'Gupta', 'Verma', 'Reddy', 'Nair', 'Jain',
];
const getRandomName = () => `${a(firstNames)} ${a(lastNames)}`;

// Job titles
const jobPrefixes = [
  'Senior', 'Lead', 'Junior', 'Principal', 'Associate', '',
];
const jobRoles = [
  'Frontend Engineer', 'Backend Developer', 'Full Stack Engineer', 'DevOps Specialist',
  'Data Scientist', 'ML Engineer', 'Product Manager', 'UX/UI Designer',
];
const getRandomJobTitle = () =>
  `${a(jobPrefixes)} ${a(jobRoles)}`.trim();

export async function seedDatabase() {
  const jobCount = await db.jobs.count();
  if (jobCount > 0) {
    console.log('Database already seeded.');
    return;
  }
  console.log('Seeding database...');

  // 1. Seed Jobs
  const jobsToSeed = [];
  for (let i = 0; i < 25; i++) {
    const title = getRandomJobTitle();
    jobsToSeed.push({
      title: title,
      slug: slugify(`${title}-${Date.now() + i}`),
      status: a(['active', 'active', 'active', 'archived']),
      order: i,
      createdAt: new Date(Date.now() - r(1, 60) * 86400000).toISOString(),
      description: `Description for ${title}`,
      tags: a([
        ['React', 'Node.js', 'Remote'],
        ['Python', 'AWS', 'ML'],
        ['Go', 'Kubernetes'],
        ['UX', 'Figma'],
      ]),
    });
  }
  const jobIds = await db.jobs.bulkAdd(jobsToSeed, {
    allKeys: true,
  });

  // 2. Seed Candidates
  const candidatesToSeed = [];
  for (let i = 0; i < 1000; i++) {
    const name = getRandomName();
    candidatesToSeed.push({
      name: name,
      email: `${slugify(name)}.${i}@example.com`,
      stage: a(STAGE_IDS),
      jobId: a(jobIds),
      createdAt: new Date(
        Date.now() - r(1, 30) * 86400000
      ).toISOString(),
      avatarUrl: `https://api.dicebear.com/8.x/avataaars/svg?seed=${name}`,
    });
  }
  await db.candidates.bulkAdd(candidatesToSeed);

  // 3. Seed Assessments
  const sampleAssessments = [
    // Assessment 1: React Dev
    {
      jobId: jobIds[0],
      title: 'React Frontend Developer Screening',
      sections: [
        {
          id: 's1',
          title: 'Core React Concepts',
          description: 'Please answer these fundamental questions.',
          questions: [
            { id: 'q1', type: 'short-text', label: 'What is JSX?', required: true },
            { id: 'q2', type: 'single-choice', label: 'What is the most common way to manage state in React?', required: true, options: ['useState Hook', 'Redux', 'Context API', 'Props'] },
            { id: 'q3', type: 'long-text', label: 'Describe the component lifecycle in a functional component.', required: true, maxLength: 500 },
            { id: 'q4', type: 'multi-choice', label: 'Which of the following are valid React hooks?', required: true, options: ['useState', 'useEffect', 'useReducer', 'useFetch'] },
            { id: 'q5', type: 'single-choice', label: 'Do you have experience with TypeScript?', required: true, options: ['Yes', 'No'] },
            { id: 'q6', type: 'long-text', label: 'If "Yes" to the above, please describe your experience.', required: false, condition: { questionId: 'q5', operator: 'eq', value: 'Yes' } },
          ],
        },
        {
          id: 's2',
          title: 'Practical Application',
          description: 'Code and file uploads.',
          questions: [
            { id: 'q7', type: 'numeric', label: 'How many years of React experience do you have?', required: true, min: 0, max: 20 },
            { id: 'q8', type: 'file', label: 'Please upload a .zip file of a small project or code sample.', required: false },
          ],
        },
      ],
    },
    // Assessment 2: Backend Dev
    {
      jobId: jobIds[1],
      title: 'Backend (Python) Screening',
      sections: [{ id: 's1_py', title: 'Python Fundamentals', questions: [
            { id: 'q1_py', type: 'single-choice', label: 'What is a decorator in Python?', required: true, options: ['A function that takes another function and extends its behavior', 'A class variable', 'A design pattern for UI'] },
            { id: 'q2_py', type: 'long-text', label: 'Explain the difference between a list and a tuple.', required: true },
      ] }],
    },
    // Assessment 3: Data Scientist
    {
      jobId: jobIds[4],
      title: 'Data Scientist Challenge',
      sections: [{ id: 's1_ds', title: 'Statistics & ML', questions: [
            { id: 'q1_ds', type: 'short-text', label: 'What is p-value?', required: true },
            { id: 'q2_ds', type: 'multi-choice', label: 'Which of these are common classification algorithms?', required: true, options: ['Logistic Regression', 'K-Means', 'Support Vector Machine', 'Linear Regression'] },
            { id: 'q3_ds', type: 'numeric', label: 'What accuracy (in %) would you consider "good"?', required: false, min: 0, max: 100 },
      ] }],
    },
  ];
  await db.assessments.bulkAdd(sampleAssessments);
  console.log('Database seeded successfully.');
}