import { http, HttpResponse, delay } from 'msw';
import { db } from '../db';

// MSW utility to simulate latency
const randomLatency = (min = 400, max = 1200) =>
  delay(min + Math.random() * (max - min));

// MSW utility to simulate write errors
const simulateError = (rate = 0.1) => {
  return Math.random() < rate;
};

export const handlers = [
  // --- JOBS ---
  http.get('/jobs', async ({ request }) => {
    await randomLatency();
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || 'all';
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(
      url.searchParams.get('pageSize') || '10',
      10
    );
    const sort = url.searchParams.get('sort') || 'order';

    let collection;

    if (status !== 'all') {
      collection = db.jobs.where('status').equals(status);
    } else {
      collection = db.jobs.toCollection();
    }

    if (search) {
      const lowerSearch = search.toLowerCase();
      collection = collection.filter(job => 
        job.title.toLowerCase().startsWith(lowerSearch) ||
        job.slug.toLowerCase().startsWith(lowerSearch)
      );
    }

    const total = await collection.count();
    const jobs = await collection
      .sortBy(sort)
      .then((res) =>
        res.slice((page - 1) * pageSize, page * pageSize)
      );

    return HttpResponse.json({
      jobs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  }),

  http.post('/jobs', async ({ request }) => {
    await randomLatency();
    if (simulateError(0.1)) {
      return new HttpResponse(
        JSON.stringify({ message: 'Server failed to create job' }),
        { status: 500 }
      );
    }

    const newJob = await request.json();
    const lastJob = await db.jobs.orderBy('order').last();
    const newOrder = (lastJob?.order || 0) + 1;

    const jobWithDefaults = {
      ...newJob,
      status: 'active',
      createdAt: new Date().toISOString(),
      order: newOrder,
    };
    const id = await db.jobs.add(jobWithDefaults);

    return HttpResponse.json({ ...jobWithDefaults, id }, { status: 201 });
  }),

  http.patch('/jobs/:id', async ({ request, params }) => {
    await randomLatency();
    if (simulateError(0.1)) {
      return new HttpResponse(
        JSON.stringify({ message: 'Failed to save changes' }),
        { status: 500 }
      );
    }

    const id = parseInt(params.id, 10);
    const updates = await request.json();
    await db.jobs.update(id, updates);

    return HttpResponse.json({ id, ...updates });
  }),

  // Reorder handler: validate payload and update per-record inside a transaction
  http.patch('/jobs/reorder', async ({ request }) => {
    await randomLatency();
    if (simulateError(0.15)) {
      return new HttpResponse(
        JSON.stringify({ message: 'Failed to reorder jobs' }),
        { status: 500 }
      );
    }

    let payload;
    try {
      payload = await request.json();
    } catch (err) {
      return new HttpResponse(
        JSON.stringify({ message: 'Invalid JSON payload' }),
        { status: 400 }
      );
    }

    const { orderedJobs } = payload || {};

    // Basic validation
    if (!Array.isArray(orderedJobs) || orderedJobs.length === 0) {
      return new HttpResponse(
        JSON.stringify({ message: 'Invalid payload for reordering' }),
        { status: 400 }
      );
    }

    // Sanitize and convert values
    const updates = orderedJobs.map(job => ({
    key: job.id,
    changes: { order: job.order }
  }));
  await db.jobs.bulkUpdate(updates);

    if (updates.length === 0) {
      return new HttpResponse(
        JSON.stringify({ message: 'No valid updates provided' }),
        { status: 400 }
      );
    }

    try {
      // Update only the 'order' field inside a transaction to avoid key-range errors
      await db.transaction('rw', db.jobs, async () => {
        await Promise.all(
          updates.map((u) => db.jobs.update(u.id, { order: u.order }))
        );
      });

      return HttpResponse.json({ status: 'ok' });
    } catch (err) {
      // Log and return 500 so MSW surfaces an error response instead of crashing
      console.error('Reorder error:', err);
      return new HttpResponse(
        JSON.stringify({ message: 'Failed to reorder jobs (internal)' }),
        { status: 500 }
      );
    }
  }),

  // --- CANDIDATES ---
  http.get('/candidates', async ({ request }) => {
    await randomLatency(600, 1500);
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const stage = url.searchParams.get('stage') || 'all';
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(
      url.searchParams.get('pageSize') || '1000',
      10
    );

    let collection;

    if (stage !== 'all') {
      collection = db.candidates.where('stage').equals(stage);
    } else {
      collection = db.candidates.toCollection();
    }

    if (search) {
      const lowerSearch = search.toLowerCase();
      collection = collection.filter(c => 
        c.name.toLowerCase().startsWith(lowerSearch) ||
        c.email.toLowerCase().startsWith(lowerSearch)
      );
    }

    const total = await collection.count();
    const candidates = await collection
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .toArray();

    return HttpResponse.json({
      candidates,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  }),

  http.post('/candidates', async ({ request }) => {
    await randomLatency();
    if (simulateError(0.1)) {
      return new HttpResponse(
        JSON.stringify({ message: 'Failed to create candidate' }),
        { status: 500 }
      );
    }

    const newCandidate = await request.json();
    const candidateWithDefaults = {
      ...newCandidate,
      stage: 'applied',
      createdAt: new Date().toISOString(),
      avatarUrl: `https://api.dicebear.com/8.x/avataaars/svg?seed=${newCandidate.name}`,
    };
    const id = await db.candidates.add(candidateWithDefaults);

    return HttpResponse.json({ ...candidateWithDefaults, id }, { status: 201 });
  }),

  http.patch('/candidates/:id', async ({ request, params }) => {
    await randomLatency();
    if (simulateError(0.1)) {
      return new HttpResponse(
        JSON.stringify({ message: 'Failed to update candidate' }),
        { status: 500 }
      );
    }

    const id = parseInt(params.id, 10);
    const updates = await request.json();
    await db.candidates.update(id, updates);

    return HttpResponse.json({ id, ...updates });
  }),

  http.get('/candidates/:id/timeline', async () => {
    await randomLatency();
    return HttpResponse.json([
      { id: 1, event: 'Applied', date: '2025-10-20T10:00:00Z', notes: 'Applied via company portal.' },
      { id: 2, event: 'AI Screen', date: '2025-10-20T10:01:00Z', notes: 'Resume matched 88% for "React" and "Node.js".' },
      { id: 3, event: 'Stage Change', date: '2025-10-21T09:15:00Z', notes: 'Moved to Screen by HR (Jane Doe).' },
      { id: 4, event: 'Assessment Sent', date: '2025-10-21T09:16:00Z', notes: 'React Fundamentals assessment sent.' },
    ]);
  }),

  // --- ASSESSMENTS ---
  http.get('/assessments/:jobId', async ({ params }) => {
    await randomLatency();
    const jobId = parseInt(params.jobId, 10);
    const assessment = await db.assessments.get(jobId);

    if (assessment) {
      return HttpResponse.json(assessment);
    } else {
      return HttpResponse.json({
        jobId: jobId,
        title: 'New Assessment',
        sections: [
          { id: 's1', title: 'Default Section', description: 'This is a default section.', questions: [] },
        ],
      });
    }
  }),

  http.put('/assessments/:jobId', async ({ request, params }) => {
    await randomLatency();
    if (simulateError(0.1)) {
      return new HttpResponse(
        JSON.stringify({ message: 'Failed to save assessment' }),
        { status: 500 }
      );
    }

    const jobId = parseInt(params.jobId, 10);
    const assessmentData = await request.json();
    await db.assessments.put({ ...assessmentData, jobId });

    return HttpResponse.json(assessmentData);
  }),

  http.post('/assessments/:jobId/submit', async ({ request, params }) => {
    await randomLatency();
    if (simulateError(0.1)) {
      return new HttpResponse(
        JSON.stringify({ message: 'Failed to submit assessment' }),
        { status: 500 }
      );
    }

    const jobId = parseInt(params.jobId, 10);
    const submission = await request.json();
    const response = {
      ...submission,
      jobId,
      createdAt: new Date().toISOString(),
    };
    const id = await db.assessmentResponses.add(response);

    return HttpResponse.json({ ...response, id }, { status: 201 });
  }),
];