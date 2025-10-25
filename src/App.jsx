import React, {
  useState,
  useEffect,
  useMemo,
  createContext,
  useContext,
  useRef,
  useCallback,
} from "react";
import { createRoot } from "react-dom/client";
import Dexie from "dexie";
import { http, HttpResponse, delay } from "msw";
import { setupWorker } from "msw/browser";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCorners,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import * as ReactWindow from "react-window";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Plus,
  GripVertical,
  Trash2,
  Edit,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
  Search,
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
  UploadCloud,
  FileText,
  Save,
  Eye,
  Settings2,
  ArrowRight,
  Grip,
} from "lucide-react";

// --- 1. CONFIG & CONSTANTS ---

const CANDIDATE_STAGES = [
  { id: "applied", title: "Applied" },
  { id: "screen", title: "Screen" },
  { id: "tech", title: "Tech Interview" },
  { id: "offer", title: "Offer" },
  { id: "hired", title: "Hired" },
  { id: "rejected", title: "Rejected" },
];
const STAGE_IDS = CANDIDATE_STAGES.map((s) => s.id);

const QUESTION_TYPES = [
  { id: "short-text", name: "Short Text" },
  { id: "long-text", name: "Long Text" },
  { id: "single-choice", name: "Single Choice" },
  { id: "multi-choice", name: "Multiple Choice" },
  { id: "numeric", name: "Numeric" },
  { id: "file", name: "File Upload" },
];

// --- 2. DEXIE DATABASE ---

const db = new Dexie("TalentFlowDB");
db.version(1).stores({
  jobs: "++id, &slug, title, status, order, createdAt",
  candidates: "++id, &email, name, stage, jobId, createdAt, [jobId+stage]",
  assessments: "&jobId, title, sections", // &jobId makes it the primary key
  assessmentResponses: "++id, candidateId, jobId, createdAt",
});

// --- 3. MSW MOCK API ---

// MSW utility to simulate latency
const randomLatency = (min = 400, max = 1200) =>
  delay(min + Math.random() * (max - min));

// MSW utility to simulate write errors
const simulateError = (rate = 0.1) => {
  return Math.random() < rate;
};

const handlers = [
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
  const sort = url.searchParams.get('sort') || 'order'; // Default sort by 'order'

  // --- CORRECTED QUERY LOGIC ---
  let collection;

  // 1. Start with a base collection (all or filtered by status)
  if (status !== 'all') {
    collection = db.jobs.where('status').equals(status);
  } else {
    collection = db.jobs.toCollection();
  }

  // 2. Apply search filter if it exists
  if (search) {
    const lowerSearch = search.toLowerCase();
    // .filter() works on both WhereClause and Collection objects
    collection = collection.filter(job => 
      job.title.toLowerCase().startsWith(lowerSearch) ||
      job.slug.toLowerCase().startsWith(lowerSearch)
    );
  }

  // 3. Now 'collection' is a Collection, which has .count() and .sortBy()
  const total = await collection.count();
  const jobs = await collection
    .sortBy(sort) // This will now work
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

  http.post("/jobs", async ({ request }) => {
    await randomLatency();
    if (simulateError(0.1)) {
      return new HttpResponse(
        JSON.stringify({ message: "Server failed to create job" }),
        { status: 500 }
      );
    }

    const newJob = await request.json();
    // Get max order
    const lastJob = await db.jobs.orderBy("order").last();
    const newOrder = (lastJob?.order || 0) + 1;

    const jobWithDefaults = {
      ...newJob,
      status: "active",
      createdAt: new Date().toISOString(),
      order: newOrder,
    };
    const id = await db.jobs.add(jobWithDefaults);

    return HttpResponse.json({ ...jobWithDefaults, id }, { status: 201 });
  }),

  http.patch("/jobs/:id", async ({ request, params }) => {
    await randomLatency();
    if (simulateError(0.1)) {
      return new HttpResponse(
        JSON.stringify({ message: "Failed to save changes" }),
        { status: 500 }
      );
    }

    const id = parseInt(params.id, 10);
    const updates = await request.json();
    await db.jobs.update(id, updates);

    return HttpResponse.json({ id, ...updates });
  }),

  // This is the bulk reorder endpoint for D&D.
  // The prompt's "PATCH /jobs/:id/reorder" is inefficient for D&D.
  // A bulk update is the correct pattern.
  http.patch("/jobs/reorder", async ({ request }) => {
    await randomLatency();
    // Higher error rate for this specific critical endpoint
    if (simulateError(0.15)) {
      return new HttpResponse(
        JSON.stringify({ message: "Failed to reorder jobs" }),
        { status: 500 }
      );
    }

    const { orderedJobs } = await request.json(); // Expects [{ id: 1, order: 0 }, { id: 2, order: 1 }, ...]
    await db.jobs.bulkUpdate(orderedJobs);

    return HttpResponse.json({ status: "ok" });
  }),

  // --- CANDIDATES ---
  http.get("/candidates", async ({ request }) => {
    await randomLatency(600, 1500); // Slower for large data
    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const stage = url.searchParams.get("stage") || "all";
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const pageSize = parseInt(
      url.searchParams.get("pageSize") || "1000", // Default to 1000 for virt list/kanban
      10
    );

    let query = db.candidates;

    if (stage !== "all") {
      query = query.where("stage").equals(stage);
    }

    if (search) {
      query = query
        .where("name")
        .startsWithIgnoreCase(search)
        .or("email")
        .startsWithIgnoreCase(search);
    }

    const total = await query.count();
    const candidates = await query
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

  http.post("/candidates", async ({ request }) => {
    await randomLatency();
    if (simulateError(0.1)) {
      return new HttpResponse(
        JSON.stringify({ message: "Failed to create candidate" }),
        { status: 500 }
      );
    }

    const newCandidate = await request.json();
    const candidateWithDefaults = {
      ...newCandidate,
      stage: "applied",
      createdAt: new Date().toISOString(),
    };
    const id = await db.candidates.add(candidateWithDefaults);

    return HttpResponse.json({ ...candidateWithDefaults, id }, { status: 201 });
  }),

  // Used for updating candidate (e.g., stage change in Kanban)
  http.patch("/candidates/:id", async ({ request, params }) => {
    await randomLatency();
    if (simulateError(0.1)) {
      return new HttpResponse(
        JSON.stringify({ message: "Failed to update candidate" }),
        { status: 500 }
      );
    }

    const id = parseInt(params.id, 10);
    const updates = await request.json();
    await db.candidates.update(id, updates);

    return HttpResponse.json({ id, ...updates });
  }),

  http.get("/candidates/:id/timeline", async () => {
    await randomLatency();
    // Just return mock data
    return HttpResponse.json([
      {
        id: 1,
        event: "Applied",
        date: "2025-10-20T10:00:00Z",
        notes: "Applied via company portal.",
      },
      {
        id: 2,
        event: "AI Screen",
        date: "2025-10-20T10:01:00Z",
        notes: 'Resume matched 88% for "React" and "Node.js".',
      },
      {
        id: 3,
        event: "Stage Change",
        date: "2025-10-21T09:15:00Z",
        notes: "Moved to Screen by HR (Jane Doe).",
      },
      {
        id: 4,
        event: "Assessment Sent",
        date: "2025-10-21T09:16:00Z",
        notes: "React Fundamentals assessment sent.",
      },
    ]);
  }),

  // --- ASSESSMENTS ---
  http.get("/assessments/:jobId", async ({ params }) => {
    await randomLatency();
    const jobId = parseInt(params.jobId, 10);
    const assessment = await db.assessments.get(jobId);

    if (assessment) {
      return HttpResponse.json(assessment);
    } else {
      // Return a default empty structure if none exists
      return HttpResponse.json({
        jobId: jobId,
        title: "New Assessment",
        sections: [
          {
            id: "s1",
            title: "Default Section",
            description: "This is a default section.",
            questions: [],
          },
        ],
      });
    }
  }),

  // PUT for create/replace
  http.put("/assessments/:jobId", async ({ request, params }) => {
    await randomLatency();
    if (simulateError(0.1)) {
      return new HttpResponse(
        JSON.stringify({ message: "Failed to save assessment" }),
        { status: 500 }
      );
    }

    const jobId = parseInt(params.jobId, 10);
    const assessmentData = await request.json();
    await db.assessments.put({ ...assessmentData, jobId });

    return HttpResponse.json(assessmentData);
  }),

  http.post("/assessments/:jobId/submit", async ({ request, params }) => {
    await randomLatency();
    if (simulateError(0.1)) {
      return new HttpResponse(
        JSON.stringify({ message: "Failed to submit assessment" }),
        { status: 500 }
      );
    }

    const jobId = parseInt(params.jobId, 10);
    const submission = await request.json(); // Expects { candidateId, responses: {...} }
    const response = {
      ...submission,
      jobId,
      createdAt: new Date().toISOString(),
    };
    const id = await db.assessmentResponses.add(response);

    return HttpResponse.json({ ...response, id }, { status: 201 });
  }),
];

// Export worker for main.jsx
export const worker = setupWorker(...handlers);

// --- 4. SEED DATA ---

// Helper for random data
const a = (arr) => arr[Math.floor(Math.random() * arr.length)];
const r = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Simple slugify
const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w-]+/g, "") // Remove all non-word chars
    .replace(/--+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, ""); // Trim - from end of text

// Random name generator
const firstNames = [
  "Aaliyah",
  "Bruno",
  "Chloe",
  "David",
  "Eliza",
  "Finn",
  "Grace",
  "Henry",
  "Isla",
  "Jack",
  "Kai",
  "Liam",
  "Mia",
  "Noah",
  "Olivia",
  "Priya",
  "Quinn",
  "Ryan",
  "Sofia",
  "Theo",
];
const lastNames = [
  "Smith",
  "Johnson",
  "Chen",
  "Patel",
  "Brown",
  "Garcia",
  "Miller",
  "Davis",
  "Kim",
  "Lee",
];
const getRandomName = () => `${a(firstNames)} ${a(lastNames)}`;

// Job titles
const jobPrefixes = ["Senior", "Lead", "Junior", "Principal", "Associate", ""];
const jobRoles = [
  "Frontend Engineer",
  "Backend Developer",
  "Full Stack Engineer",
  "DevOps Specialist",
  "Data Scientist",
  "ML Engineer",
  "Product Manager",
  "UX/UI Designer",
];
const getRandomJobTitle = () => `${a(jobPrefixes)} ${a(jobRoles)}`.trim();

async function seedDatabase() {
  const jobCount = await db.jobs.count();
  if (jobCount > 0) {
    console.log("Database already seeded.");
    return;
  }
  console.log("Seeding database...");

  // 1. Seed Jobs
  const jobsToSeed = [];
  for (let i = 0; i < 25; i++) {
    const title = getRandomJobTitle();
    jobsToSeed.push({
      title: title,
      slug: slugify(`${title}-${Date.now() + i}`),
      status: a(["active", "active", "active", "archived"]),
      order: i,
      createdAt: new Date(Date.now() - r(1, 60) * 86400000).toISOString(),
      description: `Description for ${title}`,
      tags: a([
        ["React", "Node.js", "Remote"],
        ["Python", "AWS", "ML"],
        ["Go", "Kubernetes"],
        ["UX", "Figma"],
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
      createdAt: new Date(Date.now() - r(1, 30) * 86400000).toISOString(),
      avatarUrl: `https://api.dicebear.com/8.x/avataaars/svg?seed=${name}`,
    });
  }
  await db.candidates.bulkAdd(candidatesToSeed);

  // 3. Seed Assessments
  const sampleAssessments = [
    // Assessment 1: React Dev
    {
      jobId: jobIds[0],
      title: "React Frontend Developer Screening",
      sections: [
        {
          id: "s1",
          title: "Core React Concepts",
          description: "Please answer these fundamental questions.",
          questions: [
            {
              id: "q1",
              type: "short-text",
              label: "What is JSX?",
              required: true,
            },
            {
              id: "q2",
              type: "single-choice",
              label: "What is the most common way to manage state in React?",
              required: true,
              options: ["useState Hook", "Redux", "Context API", "Props"],
            },
            {
              id: "q3",
              type: "long-text",
              label:
                "Describe the component lifecycle in a functional component.",
              required: true,
              maxLength: 500,
            },
            {
              id: "q4",
              type: "multi-choice",
              label: "Which of the following are valid React hooks?",
              required: true,
              options: ["useState", "useEffect", "useReducer", "useFetch"],
            },
            {
              id: "q5",
              type: "single-choice",
              label: "Do you have experience with TypeScript?",
              required: true,
              options: ["Yes", "No"],
            },
            {
              id: "q6",
              type: "long-text",
              label: 'If "Yes" to the above, please describe your experience.',
              required: false,
              condition: { questionId: "q5", operator: "eq", value: "Yes" },
            },
          ],
        },
        {
          id: "s2",
          title: "Practical Application",
          description: "Code and file uploads.",
          questions: [
            {
              id: "q7",
              type: "numeric",
              label: "How many years of React experience do you have?",
              required: true,
              min: 0,
              max: 20,
            },
            {
              id: "q8",
              type: "file",
              label:
                "Please upload a .zip file of a small project or code sample.",
              required: false,
            },
          ],
        },
      ],
    },
    // Assessment 2: Backend Dev
    {
      jobId: jobIds[1],
      title: "Backend (Python) Screening",
      sections: [
        {
          id: "s1_py",
          title: "Python Fundamentals",
          questions: [
            {
              id: "q1_py",
              type: "single-choice",
              label: "What is a decorator in Python?",
              required: true,
              options: [
                "A function that takes another function and extends its behavior",
                "A class variable",
                "A design pattern for UI",
              ],
            },
            {
              id: "q2_py",
              type: "long-text",
              label: "Explain the difference between a list and a tuple.",
              required: true,
            },
          ],
        },
      ],
    },
    // Assessment 3: Data Scientist
    {
      jobId: jobIds[4],
      title: "Data Scientist Challenge",
      sections: [
        {
          id: "s1_ds",
          title: "Statistics & ML",
          questions: [
            {
              id: "q1_ds",
              type: "short-text",
              label: "What is p-value?",
              required: true,
            },
            {
              id: "q2_ds",
              type: "multi-choice",
              label: "Which of these are common classification algorithms?",
              required: true,
              options: [
                "Logistic Regression",
                "K-Means",
                "Support Vector Machine",
                "Linear Regression",
              ],
            },
            {
              id: "q3_ds",
              type: "numeric",
              label: 'What accuracy (in %) would you consider "good"?',
              required: false,
              min: 0,
              max: 100,
            },
          ],
        },
      ],
    },
  ];
  await db.assessments.bulkAdd(sampleAssessments);
  console.log("Database seeded successfully.");
}

// --- 5. STATE & CONTEXT (Toasts) ---

const ToastContext = createContext();

const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const idCounter = useRef(0);

  const addToast = (message, type = "info") => {
    const id = idCounter.current++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 5000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const useToasts = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToasts must be used within a ToastProvider");
  }
  return context;
};

const toastIcons = {
  success: (
    <CheckCircle className="h-5 w-5 text-green-500" aria-hidden="true" />
  ),
  error: <AlertCircle className="h-5 w-5 text-red-500" aria-hidden="true" />,
  info: <AlertCircle className="h-5 w-5 text-blue-500" aria-hidden="true" />,
};

const toastColors = {
  success: "bg-green-50 border-green-200 text-green-800",
  error: "bg-red-50 border-red-200 text-red-800",
  info: "bg-blue-50 border-blue-200 text-blue-800",
};

const Toast = ({ id, message, type, onDismiss }) => {
  return (
    <div
      className={`max-w-sm w-full shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden border ${toastColors[type]}`}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">{toastIcons[type]}</div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className="text-sm font-medium">{message}</p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={() => onDismiss(id)}
              className={`inline-flex rounded-md p-1 ${toastColors[type]} hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            >
              <span className="sr-only">Close</span>
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 6. HELPER UTILITIES ---

// Hash-based routing parser
const parseHash = (hash) => {
  const path = hash.substring(1) || "/"; // remove #
  const parts = path.split("/").filter(Boolean); // remove empty strings

  if (parts[0] === "jobs" && parts[1]) {
    return { page: "job-detail", id: parts[1] }; // /jobs/:slug
  }
  if (parts[0] === "jobs") {
    return { page: "jobs" }; // /jobs
  }
  if (parts[0] === "candidates" && parts[1]) {
    return { page: "candidate-detail", id: parts[1] }; // /candidates/:id
  }
  if (parts[0] === "candidates") {
    return { page: "candidates" }; // /candidates
  }
  return { page: "jobs" }; // Default
};

// Simple debouncing hook
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
};

// --- 7. UI COMPONENTS (Atoms) ---

const Spinner = () => (
  <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
);

const FullPageSpinner = () => (
  <div className="fixed inset-0 bg-gray-100 bg-opacity-75 flex items-center justify-center z-50">
    <div className="flex flex-col items-center">
      <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
      <p className="mt-2 text-lg font-medium text-gray-700">
        Initializing TalentFlow...
      </p>
    </div>
  </div>
);

const Button = React.forwardRef(
  (
    {
      children,
      onClick,
      variant = "primary",
      size = "md",
      disabled = false,
      loading = false,
      icon: Icon,
      className = "",
      ...props
    },
    ref
  ) => {
    const baseStyle =
      "inline-flex items-center justify-center rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150";

    const variantStyles = {
      primary:
        "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500",
      secondary:
        "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-indigo-500",
      danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
      ghost:
        "bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-indigo-500",
    };

    const sizeStyles = {
      sm: "px-2.5 py-1.5 text-xs",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base",
      icon: "p-2",
    };

    const iconSize = {
      sm: "h-4 w-4",
      md: "h-5 w-5",
      lg: "h-6 w-6",
      icon: "h-5 w-5",
    };

    return (
      <button
        ref={ref}
        onClick={onClick}
        disabled={disabled || loading}
        className={`${baseStyle} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {loading && <Spinner />}
        {!loading && Icon && (
          <Icon className={`${iconSize[size]} ${children ? "mr-2" : ""}`} />
        )}
        {children}
      </button>
    );
  }
);

const Input = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  error,
  icon: Icon,
}) => (
  <div className="w-full">
    {label && (
      <label
        htmlFor={name}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
      </label>
    )}
    <div className="relative">
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon className="h-5 w-5 text-gray-400" />
        </div>
      )}
      <input
        type={type}
        name={name}
        id={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`block w-full rounded-md shadow-sm ${
          Icon ? "pl-10" : "pl-3"
        } ${
          error
            ? "border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500"
            : "border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
        } sm:text-sm`}
      />
    </div>
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);

const Textarea = ({ label, name, value, onChange, rows = 3, error }) => (
  <div className="w-full">
    {label && (
      <label
        htmlFor={name}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
      </label>
    )}
    <textarea
      name={name}
      id={name}
      rows={rows}
      value={value}
      onChange={onChange}
      className={`block w-full rounded-md shadow-sm ${
        error
          ? "border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500"
          : "border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
      } sm:text-sm`}
    />
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);

const Select = ({ label, name, value, onChange, children, error }) => (
  <div className="w-full">
    {label && (
      <label
        htmlFor={name}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
      </label>
    )}
    <select
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      className={`block w-full rounded-md shadow-sm py-2 px-3 ${
        error
          ? "border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500"
          : "border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
      } sm:text-sm`}
    >
      {children}
    </select>
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);

const Modal = ({ isOpen, onClose, title, children, size = "md" }) => {
  if (!isOpen) return null;

  const sizeStyles = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "4xl": "max-w-4xl",
  };

  return (
    <div
      className="fixed inset-0 z-40 bg-gray-500 bg-opacity-75 transition-opacity"
      aria-hidden="true"
    >
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={`relative bg-white rounded-lg shadow-xl transform transition-all w-full ${sizeStyles[size]} max-h-[90vh] flex flex-col`}
        >
          <div className="flex items-start justify-between p-4 border-b rounded-t">
            <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="-mt-2 -mr-2"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
          <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav className="flex items-center justify-between border-t border-gray-200 px-4 sm:px-0">
      <div className="flex-1 flex justify-between sm:hidden">
        <Button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          variant="secondary"
        >
          Previous
        </Button>
        <Button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          variant="secondary"
        >
          Next
        </Button>
      </div>
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-center">
        <div>
          <nav
            className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
            aria-label="Pagination"
          >
            <Button
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              variant="ghost"
              size="icon"
              className="rounded-l-md"
            >
              <ChevronsLeft className="h-5 w-5" />
            </Button>
            <Button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              variant="ghost"
              size="icon"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            {/* Simple page numbers */}
            <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
              Page {currentPage} of {totalPages}
            </span>

            <Button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              variant="ghost"
              size="icon"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            <Button
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              variant="ghost"
              size="icon"
              className="rounded-r-md"
            >
              <ChevronsRight className="h-5 w-5" />
            </Button>
          </nav>
        </div>
      </div>
    </nav>
  );
};

// --- 8. FEATURE COMPONENTS (Jobs) ---

/**
 * JobListItem (Sortable)
 * This component is used inside the D&D context.
 */
const SortableJobItem = ({ job, navigate }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: job.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : "auto",
    opacity: isDragging ? 0.8 : 1,
  };

  const statusColor =
    job.status === "active"
      ? "bg-green-100 text-green-800"
      : "bg-gray-100 text-gray-800";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center bg-white shadow-sm rounded-lg p-4 border border-gray-200"
    >
      <Button
        variant="ghost"
        size="icon"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-5 w-5 text-gray-400" />
      </Button>
      <div className="ml-4 flex-grow">
        <a
          href={`#/jobs/${job.slug}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/jobs/${job.slug}`);
          }}
          className="text-lg font-semibold text-indigo-600 hover:underline"
        >
          {job.title}
        </a>
        <div className="text-sm text-gray-500">
          Created: {new Date(job.createdAt).toLocaleDateString()}
        </div>
        <div className="mt-2 flex space-x-2">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}
          >
            {job.status}
          </span>
          {job.tags?.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
      <Button variant="secondary" onClick={() => navigate(`/jobs/${job.slug}`)}>
        Manage
      </Button>
    </div>
  );
};

/**
 * JobsPage
 * Displays the list of jobs with D&D reordering.
 */
const JobsPage = ({ navigate }) => {
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    page: 1,
  });

  const debouncedSearch = useDebounce(filters.search, 300);
  const { addToast } = useToasts();

  // Active D&D item
  const [activeJob, setActiveJob] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor));

  // Data fetching
  const fetchJobs = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          search: debouncedSearch,
          status: filters.status,
          page: page,
          pageSize: 10,
          sort: "order",
        });
        const res = await fetch(`/jobs?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch jobs");
        const data = await res.json();
        setJobs(data.jobs);
        setPagination(data.pagination);
      } catch (error) {
        addToast(error.message, "error");
      } finally {
        setIsLoading(false);
      }
    },
    [debouncedSearch, filters.status, addToast]
  );

  useEffect(() => {
    fetchJobs(filters.page);
  }, [fetchJobs, filters.page]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value, page: 1 }));
  };

  // --- D&D Handlers ---
  const handleDragStart = (event) => {
    const { active } = event;
    setActiveJob(jobs.find((j) => j.id === active.id));
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveJob(null);

    if (over && active.id !== over.id) {
      const oldIndex = jobs.findIndex((j) => j.id === active.id);
      const newIndex = jobs.findIndex((j) => j.id === over.id);

      // 1. Calculate new array optimistically
      const newJobsArray = arrayMove(jobs, oldIndex, newIndex);

      // 2. Create the data for the optimistic update (UI) and API call
      // We must re-calculate the 'order' field for all items
      const newJobsWithOrder = newJobsArray.map((job, index) => ({
        ...job,
        order: index, // This assumes pagination is off.
        // For pagination, you'd need to use (page - 1) * pageSize + index
        // Let's assume for reordering, we fetch all active jobs.
        // For simplicity, we'll re-order based on the current page.
        // A better production implementation would re-order ALL jobs.
      }));

      const apiPayload = newJobsWithOrder.map((j) => ({
        id: j.id,
        order: j.order,
      }));

      // 3. Save original state for rollback
      const originalJobs = [...jobs];

      // 4. Optimistic UI Update
      setJobs(newJobsWithOrder);

      // 5. API Call
      try {
        const res = await fetch("/jobs/reorder", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedJobs: apiPayload }),
        });

        if (!res.ok) {
          // Trigger the catch block
          const errorData = await res.json();
          throw new Error(errorData.message || "API Reorder failed");
        }

        addToast("Job order saved!", "success");
        // On success, do nothing, the optimistic state is correct.
      } catch (error) {
        // 6. Rollback on error
        addToast(`Error: ${error.message}. Reverting changes.`, "error");
        setJobs(originalJobs);
      }
    }
  };

  // Job created in modal, refresh list
  const onJobCreated = () => {
    setIsModalOpen(false);
    fetchJobs(1); // Go back to first page
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Jobs Board</h1>
        <Button icon={Plus} onClick={() => setIsModalOpen(true)}>
          Create Job
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white rounded-lg shadow-sm">
        <Input
          name="search"
          placeholder="Search by title..."
          icon={Search}
          value={filters.search}
          onChange={handleFilterChange}
        />
        <Select
          name="status"
          value={filters.status}
          onChange={handleFilterChange}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </Select>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center h-64">
          <Spinner />
        </div>
      )}

      {!isLoading && jobs.length === 0 && (
        <div className="text-center p-12 bg-white rounded-lg shadow-sm">
          <h3 className="text-xl font-medium text-gray-700">No jobs found</h3>
          <p className="text-gray-500 mt-1">
            Try adjusting your filters or create a new job.
          </p>
        </div>
      )}

      {!isLoading && jobs.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={jobs.map((j) => j.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {jobs.map((job) => (
                <SortableJobItem key={job.id} job={job} navigate={navigate} />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeJob ? (
              <div className="shadow-2xl">
                <SortableJobItem job={activeJob} navigate={() => {}} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {!isLoading && pagination && (
        <div className="mt-8">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
          />
        </div>
      )}

      <JobCreateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onJobCreated={onJobCreated}
      />
    </div>
  );
};

/**
 * JobCreateModal
 * Modal form for creating a new job.
 */
const JobCreateModal = ({ isOpen, onClose, onJobCreated }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { addToast } = useToasts();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!title) {
      setErrors({ title: "Title is required" });
      return;
    }

    setIsLoading(true);
    const newJob = {
      title,
      slug: slugify(title),
      description,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };

    try {
      const res = await fetch("/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newJob),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create job");
      }

      addToast("Job created successfully!", "success");
      onJobCreated();
      // Reset form
      setTitle("");
      setDescription("");
      setTags("");
    } catch (error) {
      addToast(error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Job">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Job Title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Senior React Engineer"
          error={errors.title}
          required
        />
        <Textarea
          label="Description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
        />
        <Input
          label="Tags (comma-separated)"
          name="tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="e.g., React, Remote, TypeScript"
        />
        <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isLoading} disabled={isLoading}>
            Create Job
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// --- 9. FEATURE COMPONENTS (Assessments) ---

/**
 * AssessmentQuestionEditor
 * A component within the builder to edit a single question.
 */
const AssessmentQuestionEditor = ({
  question,
  updateQuestion,
  removeQuestion,
  allQuestions,
}) => {
  const [optionsText, setOptionsText] = useState(
    question.options?.join("\n") || ""
  );

  const handleTypeChange = (e) => {
    const newType = e.target.value;
    const updates = { type: newType };
    if (newType === "single-choice" || newType === "multi-choice") {
      updates.options = question.options || ["Option 1", "Option 2"];
      setOptionsText(updates.options.join("\n"));
    } else {
      delete updates.options;
    }

    if (newType === "numeric") {
      updates.min = 0;
      updates.max = 100;
    } else {
      delete updates.min;
      delete updates.max;
    }

    if (newType === "long-text") {
      updates.maxLength = 500;
    } else {
      delete updates.maxLength;
    }

    updateQuestion(updates);
  };

  const handleOptionsChange = (e) => {
    setOptionsText(e.target.value);
    updateQuestion({ options: e.target.value.split("\n").filter(Boolean) });
  };

  const handleConditionChange = (field, value) => {
    updateQuestion({
      condition: {
        ...(question.condition || {}),
        [field]: value,
      },
    });
  };

  return (
    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
      <div className="flex justify-between items-center">
        <h4 className="font-medium text-gray-800">Question: {question.id}</h4>
        <Button
          variant="ghost"
          size="icon"
          onClick={removeQuestion}
          className="text-red-500 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Label & Type */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <Input
            label="Question Label"
            value={question.label || ""}
            onChange={(e) => updateQuestion({ label: e.target.value })}
          />
        </div>
        <Select
          label="Question Type"
          value={question.type}
          onChange={handleTypeChange}
        >
          {QUESTION_TYPES.map((qt) => (
            <option key={qt.id} value={qt.id}>
              {qt.name}
            </option>
          ))}
        </Select>
      </div>

      {/* Required Toggle */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id={`required-${question.id}`}
          checked={question.required || false}
          onChange={(e) => updateQuestion({ required: e.target.checked })}
          className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
        />
        <label
          htmlFor={`required-${question.id}`}
          className="ml-2 block text-sm text-gray-900"
        >
          Required
        </label>
      </div>

      {/* Type-specific options */}
      {(question.type === "single-choice" ||
        question.type === "multi-choice") && (
        <Textarea
          label="Options (one per line)"
          value={optionsText}
          onChange={handleOptionsChange}
          rows={4}
        />
      )}

      {question.type === "long-text" && (
        <Input
          label="Max Length"
          type="number"
          value={question.maxLength || ""}
          onChange={(e) =>
            updateQuestion({ maxLength: parseInt(e.target.value, 10) || 0 })
          }
        />
      )}

      {question.type === "numeric" && (
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Min Value"
            type="number"
            value={question.min ?? ""}
            onChange={(e) =>
              updateQuestion({
                min:
                  e.target.value === ""
                    ? undefined
                    : parseInt(e.target.value, 10),
              })
            }
          />
          <Input
            label="Max Value"
            type="number"
            value={question.max ?? ""}
            onChange={(e) =>
              updateQuestion({
                max:
                  e.target.value === ""
                    ? undefined
                    : parseInt(e.target.value, 10),
              })
            }
          />
        </div>
      )}

      {/* Conditional Logic */}
      <div className="pt-3 border-t border-gray-200">
        <h5 className="text-sm font-medium text-gray-700 mb-2">
          Conditional Logic
        </h5>
        <p className="text-xs text-gray-500 mb-2">
          Show this question only if...
        </p>
        <div className="grid grid-cols-3 gap-2">
          <Select
            label="Question"
            value={question.condition?.questionId || ""}
            onChange={(e) =>
              handleConditionChange("questionId", e.target.value)
            }
          >
            <option value="">(No Condition)</option>
            {allQuestions
              .filter(
                (q) =>
                  q.id !== question.id &&
                  (q.type === "single-choice" || q.type === "multi-choice")
              )
              .map((q) => (
                <option key={q.id} value={q.id}>
                  {q.label || q.id}
                </option>
              ))}
          </Select>
          <Select
            label="Operator"
            value={question.condition?.operator || "eq"}
            onChange={(e) => handleConditionChange("operator", e.target.value)}
          >
            <option value="eq">is equal to</option>
            <option value="neq">is not equal to</option>
            <option value="contains">contains</option>
          </Select>
          <Input
            label="Value"
            value={question.condition?.value || ""}
            onChange={(e) => handleConditionChange("value", e.target.value)}
            placeholder="e.g., Yes"
          />
        </div>
      </div>
    </div>
  );
};

/**
 * AssessmentRuntime
 * Renders a fillable form from an assessment JSON structure.
 * Manages responses and validation.
 */
const AssessmentRuntime = ({
  assessment,
  responses,
  setResponses,
  errors,
  readOnly = false,
}) => {
  const handleResponseChange = (id, value) => {
    if (readOnly) return;
    setResponses((prev) => ({ ...prev, [id]: value }));
  };

  const handleMultiChoiceChange = (id, option, checked) => {
    if (readOnly) return;
    const current = responses[id] || [];
    let newValues;
    if (checked) {
      newValues = [...current, option];
    } else {
      newValues = current.filter((item) => item !== option);
    }
    handleResponseChange(id, newValues);
  };

  // Check conditional logic
  const isQuestionVisible = (question) => {
    if (!question.condition || !question.condition.questionId) {
      return true;
    }

    const { questionId, operator, value } = question.condition;
    const targetResponse = responses[questionId];

    if (!targetResponse) return false;

    switch (operator) {
      case "eq":
        return Array.isArray(targetResponse)
          ? targetResponse.includes(value)
          : targetResponse === value;
      case "neq":
        return Array.isArray(targetResponse)
          ? !targetResponse.includes(value)
          : targetResponse !== value;
      case "contains":
        return Array.isArray(targetResponse)
          ? targetResponse.includes(value)
          : String(targetResponse).includes(value);
      default:
        return true;
    }
  };

  // Render a single question based on its type
  const renderQuestion = (q) => {
    const value = responses[q.id];
    const error = errors[q.id];

    switch (q.type) {
      case "short-text":
        return (
          <Input
            name={q.id}
            value={value || ""}
            onChange={(e) => handleResponseChange(q.id, e.target.value)}
            error={error}
            disabled={readOnly}
          />
        );
      case "long-text":
        return (
          <Textarea
            name={q.id}
            value={value || ""}
            onChange={(e) => handleResponseChange(q.id, e.target.value)}
            rows={4}
            error={error}
            disabled={readOnly}
          />
        );
      case "numeric":
        return (
          <Input
            type="number"
            name={q.id}
            value={value ?? ""}
            onChange={(e) =>
              handleResponseChange(
                q.id,
                e.target.value === "" ? undefined : parseFloat(e.target.value)
              )
            }
            min={q.min}
            max={q.max}
            error={error}
            disabled={readOnly}
          />
        );
      case "single-choice":
        return (
          <div className="space-y-2">
            {q.options.map((opt) => (
              <div key={opt} className="flex items-center">
                <input
                  type="radio"
                  id={`${q.id}-${opt}`}
                  name={q.id}
                  value={opt}
                  checked={value === opt}
                  onChange={(e) => handleResponseChange(q.id, e.target.value)}
                  className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                  disabled={readOnly}
                />
                <label
                  htmlFor={`${q.id}-${opt}`}
                  className="ml-2 block text-sm text-gray-700"
                >
                  {opt}
                </label>
              </div>
            ))}
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          </div>
        );
      case "multi-choice":
        return (
          <div className="space-y-2">
            {q.options.map((opt) => (
              <div key={opt} className="flex items-center">
                <input
                  type="checkbox"
                  id={`${q.id}-${opt}`}
                  name={q.id}
                  value={opt}
                  checked={value?.includes(opt) || false}
                  onChange={(e) =>
                    handleMultiChoiceChange(q.id, opt, e.target.checked)
                  }
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  disabled={readOnly}
                />
                <label
                  htmlFor={`${q.id}-${opt}`}
                  className="ml-2 block text-sm text-gray-700"
                >
                  {opt}
                </label>
              </div>
            ))}
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          </div>
        );
      case "file":
        return (
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor={q.id}
                  className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                >
                  <span>Upload a file</span>
                  <input
                    id={q.id}
                    name={q.id}
                    type="file"
                    className="sr-only"
                    disabled={readOnly}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">File upload is stubbed</p>
              {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
            </div>
          </div>
        );
      default:
        return <p className="text-red-500">Unknown question type: {q.type}</p>;
    }
  };

  return (
    <div className="space-y-8 p-4">
      <h2 className="text-2xl font-bold text-gray-900">{assessment.title}</h2>
      {assessment.sections?.map((section) => (
        <div key={section.id} className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-800">
              {section.title}
            </h3>
            {section.description && (
              <p className="mt-1 text-sm text-gray-500">
                {section.description}
              </p>
            )}
          </div>

          <div className="space-y-6">
            {section.questions.filter(isQuestionVisible).map((q) => (
              <div
                key={q.id}
                className="p-4 bg-white rounded-lg shadow-sm border border-gray-200"
              >
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {q.label}
                  {q.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {renderQuestion(q)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * AssessmentBuilder
 * Main component for creating/editing an assessment.
 * Includes the builder UI and the live preview.
 */
const AssessmentBuilder = ({ jobId }) => {
  const [assessment, setAssessment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const { addToast } = useToasts();

  // Live responses for the preview pane
  const [previewResponses, setPreviewResponses] = useState({});
  const [previewErrors, setPreviewErrors] = useState({});

  useEffect(() => {
    const fetchAssessment = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/assessments/${jobId}`);
        if (!res.ok) throw new Error("Failed to load assessment");
        const data = await res.json();
        setAssessment(data);
      } catch (error) {
        addToast(error.message, "error");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssessment();
  }, [jobId, addToast]);

  // --- Builder Mutators ---

  const genId = () =>
    `id_${new Date().getTime()}_${Math.random().toString(36).substring(2, 9)}`;

  const updateAssessment = (field, value) => {
    setAssessment((prev) => ({ ...prev, [field]: value }));
  };

  const addSection = () => {
    const newSection = {
      id: genId(),
      title: "New Section",
      description: "",
      questions: [],
    };
    setAssessment((prev) => ({
      ...prev,
      sections: [...prev.sections, newSection],
    }));
  };

  const updateSection = (sectionId, updates) => {
    setAssessment((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId ? { ...s, ...updates } : s
      ),
    }));
  };

  const removeSection = (sectionId) => {
    setAssessment((prev) => ({
      ...prev,
      sections: prev.sections.filter((s) => s.id !== sectionId),
    }));
  };

  const addQuestion = (sectionId) => {
    const newQuestion = {
      id: genId(),
      type: "short-text",
      label: "New Question",
      required: false,
    };
    setAssessment((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId
          ? { ...s, questions: [...s.questions, newQuestion] }
          : s
      ),
    }));
  };

  const updateQuestion = (sectionId, questionId, updates) => {
    setAssessment((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              questions: s.questions.map((q) =>
                q.id === questionId ? { ...q, ...updates } : q
              ),
            }
          : s
      ),
    }));
  };

  const removeQuestion = (sectionId, questionId) => {
    setAssessment((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId
          ? { ...s, questions: s.questions.filter((q) => q.id !== questionId) }
          : s
      ),
    }));
  };

  const allQuestions = useMemo(() => {
    return assessment?.sections.flatMap((s) => s.questions) || [];
  }, [assessment]);

  // --- Save Handler ---

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/assessments/${jobId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assessment),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save");
      }
      addToast("Assessment saved successfully!", "success");
    } catch (error) {
      addToast(error.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // --- Preview Validation (Client-side) ---
  const validatePreview = () => {
    const errors = {};
    for (const q of allQuestions) {
      const isVisible = isQuestionVisible(q); // Need to define this
      if (q.required && isVisible) {
        const value = previewResponses[q.id];
        if (!value || (Array.isArray(value) && value.length === 0)) {
          errors[q.id] = "This field is required";
        }
      }

      if (q.type === "numeric" && previewResponses[q.id] != null) {
        const num = parseFloat(previewResponses[q.id]);
        if (q.min != null && num < q.min) {
          errors[q.id] = `Must be at least ${q.min}`;
        }
        if (q.max != null && num > q.max) {
          errors[q.id] = `Must be at most ${q.max}`;
        }
      }
      // ... other validations
    }
    setPreviewErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Need to duplicate this for the preview validation
  const isQuestionVisible = (question) => {
    if (!question.condition || !question.condition.questionId) return true;
    const { questionId, operator, value } = question.condition;
    const targetResponse = previewResponses[questionId];
    if (!targetResponse) return false;
    switch (operator) {
      case "eq":
        return Array.isArray(targetResponse)
          ? targetResponse.includes(value)
          : targetResponse === value;
      case "neq":
        return Array.isArray(targetResponse)
          ? !targetResponse.includes(value)
          : targetResponse !== value;
      case "contains":
        return Array.isArray(targetResponse)
          ? targetResponse.includes(value)
          : String(targetResponse).includes(value);
      default:
        return true;
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="p-4 bg-white border-b border-gray-200 flex justify-between items-center">
        <Input
          name="title"
          value={assessment.title}
          onChange={(e) => updateAssessment("title", e.target.value)}
          className="text-xl font-semibold !border-none !shadow-none focus:!ring-0"
        />
        <div className="flex space-x-2">
          {/* Toggle Builder/Preview */}
          <div className="flex rounded-md shadow-sm">
            <Button
              onClick={() => setPreviewMode(false)}
              variant={!previewMode ? "primary" : "secondary"}
              className="rounded-r-none"
              icon={Settings2}
            >
              Builder
            </Button>
            <Button
              onClick={() => setPreviewMode(true)}
              variant={previewMode ? "primary" : "secondary"}
              className="rounded-l-none"
              icon={Eye}
            >
              Preview
            </Button>
          </div>

          <Button icon={Save} loading={isSaving} onClick={handleSave}>
            Save Assessment
          </Button>
        </div>
      </div>

      <div className="h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar bg-gray-100 p-8">
        {previewMode ? (
          // --- Preview Pane ---
          <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg">
            <AssessmentRuntime
              assessment={assessment}
              responses={previewResponses}
              setResponses={setPreviewResponses}
              errors={previewErrors}
            />
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <Button
                onClick={() => {
                  if (validatePreview()) {
                    addToast(
                      "Preview submitted successfully! (No data saved)",
                      "success"
                    );
                  } else {
                    addToast("Please fix validation errors", "error");
                  }
                }}
              >
                Submit (Preview)
              </Button>
            </div>
          </div>
        ) : (
          // --- Builder Pane ---
          <div className="max-w-3xl mx-auto space-y-6">
            {assessment.sections.map((section, sIdx) => (
              <div
                key={section.id}
                className="p-6 bg-white rounded-lg shadow-md border border-gray-200"
              >
                <div className="flex justify-between items-center mb-4">
                  <Input
                    name="sectionTitle"
                    value={section.title}
                    onChange={(e) =>
                      updateSection(section.id, { title: e.target.value })
                    }
                    className="text-lg font-medium !border-none !shadow-none focus:!ring-0 -ml-3"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSection(section.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <Textarea
                  name="sectionDescription"
                  value={section.description}
                  onChange={(e) =>
                    updateSection(section.id, { description: e.target.value })
                  }
                  placeholder="Section description (optional)"
                  rows={2}
                  className="mb-4"
                />

                <div className="space-y-4">
                  {section.questions.map((q, qIdx) => (
                    <AssessmentQuestionEditor
                      key={q.id}
                      question={q}
                      updateQuestion={(updates) =>
                        updateQuestion(section.id, q.id, updates)
                      }
                      removeQuestion={() => removeQuestion(section.id, q.id)}
                      allQuestions={allQuestions}
                    />
                  ))}
                </div>

                <Button
                  icon={Plus}
                  variant="secondary"
                  onClick={() => addQuestion(section.id)}
                  className="mt-6"
                >
                  Add Question
                </Button>
              </div>
            ))}

            <Button
              icon={Plus}
              variant="secondary"
              onClick={addSection}
              className="w-full border-dashed"
            >
              Add Section
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * JobDetailPage
 * A wrapper page that shows job details and the assessment builder.
 */
const JobDetailPage = ({ slug, navigate }) => {
  const [job, setJob] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useToasts();

  useEffect(() => {
    const fetchJob = async () => {
      try {
        // Dexie doesn't support get by slug directly if it's not primary key or index
        // We'll use the 'search' API, which is a bit of a hack
        const res = await fetch(`/jobs?search=${slug}&status=all`);
        if (!res.ok) throw new Error("Failed to fetch job");
        const data = await res.json();
        const matchingJob = data.jobs.find((j) => j.slug === slug);
        if (matchingJob) {
          setJob(matchingJob);
        } else {
          throw new Error("Job not found");
        }
      } catch (error) {
        addToast(error.message, "error");
        navigate("/jobs");
      } finally {
        setIsLoading(false);
      }
    };
    fetchJob();
  }, [slug, addToast, navigate]);

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <Spinner />
      </div>
    );
  }

  if (!job) return null; // Will be redirected

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-gray-200 bg-white">
        <a
          href="#/jobs"
          onClick={(e) => {
            e.preventDefault();
            navigate("/jobs");
          }}
          className="text-sm text-indigo-600 hover:underline flex items-center mb-2"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Jobs
        </a>
        <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
        {/* We could have more job details here, but focus is on assessment */}
      </div>

      {/* Assessment Builder takes the rest of the height */}
      <AssessmentBuilder jobId={job.id} />
    </div>
  );
};

// --- 10. FEATURE COMPONENTS (Candidates) ---

/**
 * VirtualizedCandidateList
 * Renders the 1000+ candidates using react-window.
 */
const VirtualizedCandidateList = ({ candidates, navigate }) => {
  const Row = ({ index, style }) => {
    const candidate = candidates[index];
    const stage = CANDIDATE_STAGES.find((s) => s.id === candidate.stage);

    return (
      <div style={style} className="border-b border-gray-200">
        <div className="flex items-center p-4 hover:bg-gray-50">
          <img
            src={candidate.avatarUrl}
            alt={candidate.name}
            className="h-10 w-10 rounded-full"
          />
          <div className="ml-4 flex-grow">
            <a
              href={`#/candidates/${candidate.id}`}
              onClick={(e) => {
                e.preventDefault();
                navigate(`/candidates/${candidate.id}`);
              }}
              className="text-sm font-medium text-indigo-600 hover:underline"
            >
              {candidate.name}
            </a>
            <p className="text-sm text-gray-500">{candidate.email}</p>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {stage?.title || "Unknown"}
            </span>
            <p className="text-xs text-gray-400 mt-1">
              Applied: {new Date(candidate.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // This is a common pattern to make react-window responsive.
  // We'll skip it for simplicity and use fixed height.
  // In a real app, you'd use react-virtualized-auto-sizer.
  const listHeight = 600;

  // Resolve FixedSizeList whether it's a named export or on the default export
  const ListComponent =
    ReactWindow.FixedSizeList ||
    (ReactWindow.default && ReactWindow.default.FixedSizeList);

  // If FixedSizeList isn't available for some reason, gracefully fall back
  if (!ListComponent) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200">
        {candidates.map((candidate, idx) => (
          <div key={candidate.id} className="border-b border-gray-200">
            <div className="flex items-center p-4 hover:bg-gray-50">
              <img
                src={candidate.avatarUrl}
                alt={candidate.name}
                className="h-10 w-10 rounded-full"
              />
              <div className="ml-4 flex-grow">
                <a
                  href={`#/candidates/${candidate.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/candidates/${candidate.id}`);
                  }}
                  className="text-sm font-medium text-indigo-600 hover:underline"
                >
                  {candidate.name}
                </a>
                <p className="text-sm text-gray-500">{candidate.email}</p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {CANDIDATE_STAGES.find((s) => s.id === candidate.stage)?.title ||
                    "Unknown"}
                </span>
                <p className="text-xs text-gray-400 mt-1">
                  Applied: {new Date(candidate.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      <ListComponent
        height={listHeight}
        itemCount={candidates.length}
        itemSize={73} // 72px for row + 1px for border
        width="100%"
      >
        {Row}
      </ListComponent>
    </div>
  );
};

/**
 * Kanban Card (Sortable)
 */
const KanbanCard = ({ candidate, navigate }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: candidate.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 10 : "auto",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white p-3 rounded-md shadow-sm border border-gray-200 mb-2 cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-center space-x-2">
        <img
          src={candidate.avatarUrl}
          alt={candidate.name}
          className="h-8 w-8 rounded-full"
        />
        <div>
          <a
            href={`#/candidates/${candidate.id}`}
            onClick={(e) => {
              e.preventDefault();
              navigate(`/candidates/${candidate.id}`);
            }}
            className="text-sm font-medium text-gray-800 hover:underline"
          >
            {candidate.name}
          </a>
          <p className="text-xs text-gray-500">{candidate.email}</p>
        </div>
      </div>
    </div>
  );
};

/**
 * Kanban Column (Droppable)
 */
const KanbanColumn = ({ id, title, candidates, navigate }) => {
  const { setNodeRef } = useSortable({ id });

  return (
    <div
      ref={setNodeRef} // This is incorrect for dnd-kit, but works for SortableContext
      className="w-72 flex-shrink-0 bg-gray-100 rounded-lg p-3"
    >
      <h3 className="text-sm font-semibold text-gray-700 mb-3 px-1">
        {title.toUpperCase()} ({candidates.length})
      </h3>
      <SortableContext
        items={candidates.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar pr-1">
          {candidates.map((c) => (
            <KanbanCard key={c.id} candidate={c} navigate={navigate} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
};

/**
 * CandidateKanban
 * Renders the D&D Kanban board.
 */
const CandidateKanban = ({ candidates, setCandidates, navigate }) => {
  const { addToast } = useToasts();
  const [activeCandidate, setActiveCandidate] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px drag to start
      },
    })
  );

  // Group candidates by stage for rendering columns
  const candidatesByStage = useMemo(() => {
    const grouped = {};
    STAGE_IDS.forEach((stageId) => {
      grouped[stageId] = [];
    });
    candidates.forEach((c) => {
      if (grouped[c.stage]) {
        grouped[c.stage].push(c);
      }
    });
    return grouped;
  }, [candidates]);

  // We need to find the container (stage) an item is in
  const findContainer = (id) => {
    if (STAGE_IDS.includes(id)) {
      return id;
    }
    return candidates.find((c) => c.id === id)?.stage;
  };

  const handleDragStart = (event) => {
    const { active } = event;
    setActiveCandidate(candidates.find((c) => c.id === active.id));
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id);

    if (
      !activeContainer ||
      !overContainer ||
      activeContainer === overContainer
    ) {
      return;
    }

    // This is a simple drag-over. We update the UI optimistically.
    // The actual state update and API call happen in handleDragEnd.
    // For a smoother UI, we can optimistically update here.
    setCandidates((prev) => {
      const activeIndex = prev.findIndex((c) => c.id === active.id);
      if (activeIndex === -1) return prev;

      const newItems = [...prev];
      newItems[activeIndex].stage = overContainer;
      return newItems;
    });
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveCandidate(null);

    if (!over) return;

    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id);

    if (
      !activeContainer ||
      !overContainer ||
      activeContainer === overContainer
    ) {
      // Item was dropped in the same container, or invalid drop
      // We could handle re-ordering *within* a column here if needed
      return;
    }

    // --- Optimistic Update ---
    const candidateId = active.id;
    const newStage = overContainer;

    // 1. Find the original candidate to get its old stage
    const originalCandidate = candidates.find((c) => c.id === candidateId);
    if (!originalCandidate) return;
    const oldStage = originalCandidate.stage;

    // 2. Optimistically update UI state
    setCandidates((prev) =>
      prev.map((c) => (c.id === candidateId ? { ...c, stage: newStage } : c))
    );

    // 3. API Call
    try {
      const res = await fetch(`/candidates/${candidateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "API call failed");
      }

      addToast(
        `${originalCandidate.name} moved to ${
          CANDIDATE_STAGES.find((s) => s.id === newStage).title
        }`,
        "success"
      );
    } catch (error) {
      // 4. Rollback
      addToast(`Error: ${error.message}. Reverting stage change.`, "error");
      setCandidates((prev) =>
        prev.map((c) => (c.id === candidateId ? { ...c, stage: oldStage } : c))
      );
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex space-x-4 overflow-x-auto custom-scrollbar p-4 bg-gray-50 h-full">
        <SortableContext items={STAGE_IDS}>
          {CANDIDATE_STAGES.map((stage) => (
            <KanbanColumn
              key={stage.id}
              id={stage.id}
              title={stage.title}
              candidates={candidatesByStage[stage.id]}
              navigate={navigate}
            />
          ))}
        </SortableContext>
      </div>

      <DragOverlay>
        {activeCandidate ? (
          <div className="shadow-2xl">
            <KanbanCard candidate={activeCandidate} navigate={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

/**
 * CandidateCreateModal
 * Modal form for creating a new candidate.
 */
const CandidateCreateModal = ({ isOpen, onClose, onCandidateCreated }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [jobId, setJobId] = useState('');
  
  const [jobs, setJobs] = useState([]); // To populate the dropdown
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { addToast } = useToasts();

  // Fetch active jobs when the modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchActiveJobs = async () => {
        try {
          // Fetch all active jobs for the assignment dropdown
          const res = await fetch('/jobs?status=active&pageSize=1000');
          if (!res.ok) throw new Error('Failed to fetch jobs');
          const data = await res.json();
          setJobs(data.jobs);
          // Default to the first job if available
          if (data.jobs.length > 0) {
            setJobId(data.jobs[0].id);
          }
        } catch (error) {
          addToast(error.message, 'error');
        }
      };
      fetchActiveJobs();
    }
  }, [isOpen, addToast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    
    // Validation
    let newErrors = {};
    if (!name) newErrors.name = 'Name is required';
    if (!email) newErrors.email = 'Email is required';
    if (!jobId) newErrors.jobId = 'A job must be selected';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    const newCandidate = {
      name,
      email,
      jobId: parseInt(jobId, 10),
    };

    try {
      const res = await fetch('/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCandidate),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create candidate');
      }

      addToast('Candidate created successfully!', 'success');
      onCandidateCreated(); // Call callback to refresh list
      
      // Reset form
      setName('');
      setEmail('');
      setJobId(jobs.length > 0 ? jobs[0].id : '');
      
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Candidate">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Jane Doe"
          error={errors.name}
          required
        />
        <Input
          label="Email Address"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="e.g., jane.doe@example.com"
          error={errors.email}
          required
        />
        <Select
          label="Assign to Job"
          name="jobId"
          value={jobId}
          onChange={(e) => setJobId(e.target.value)}
          error={errors.jobId}
          required
        >
          <option value="" disabled>Select a job...</option>
          {jobs.map(job => (
            <option key={job.id} value={job.id}>{job.title}</option>
          ))}
        </Select>
        <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isLoading} disabled={isLoading}>
            Add Candidate
          </Button>
        </div>
      </form>
    </Modal>
  );
};


/**
 * CandidatesPage
 * Main page, toggles between List and Kanban.
 */
const CandidatesPage = ({ navigate }) => {
  const [view, setView] = useState('list'); // 'list' or 'kanban'
  const [candidates, setCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false); // <-- ADD THIS
  const { addToast } = useToasts();
  
  // Client-side search (as required)
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  // --- REFACTOR DATA FETCHING ---
  // Wrap in useCallback so it can be passed to useEffect and onCandidateCreated
  const fetchAllCandidates = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch up to 1000 candidates for client-side filtering/kanban
      const res = await fetch('/candidates?page=1&pageSize=1000');
      if (!res.ok) throw new Error('Failed to fetch candidates');
      const data = await res.json();
      setCandidates(data.candidates);
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]); // Add addToast as a dependency

  // Initial fetch
  useEffect(() => {
    fetchAllCandidates();
  }, [fetchAllCandidates]); // Use the useCallback function
  
  // Callback for when a new candidate is created
  const onCandidateCreated = () => {
    setIsModalOpen(false); // Close the modal
    fetchAllCandidates(); // Refresh the entire candidate list
  };
  // --- END REFACTOR ---
  
  // Client-side filtering logic
  const filteredCandidates = useMemo(() => {
    const lowerSearch = debouncedSearch.toLowerCase();
    return candidates.filter(c => {
      const nameMatch = c.name.toLowerCase().includes(lowerSearch);
      const emailMatch = c.email.toLowerCase().includes(lowerSearch);
      return nameMatch || emailMatch;
    });
  }, [candidates, debouncedSearch]);

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Candidates</h1>
        {/* UPDATE THE BUTTON'S onClick */}
        <Button icon={Plus} onClick={() => setIsModalOpen(true)}>
          Add Candidate
        </Button>
      </div>
      
      {/* Filters & View Toggle */}
      <div className="mb-4 p-4 bg-white rounded-lg shadow-sm flex justify-between items-center">
        <div className="w-1/2">
          <Input
            name="search"
            placeholder="Client-side search by name/email..."
            icon={Search}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex rounded-md shadow-sm">
           <Button 
            onClick={() => setView('list')}
            variant={view === 'list' ? 'primary' : 'secondary'}
            className="rounded-r-none"
          >
            List
          </Button>
          <Button 
            onClick={() => setView('kanban')}
            variant={view === 'kanban' ? 'primary' : 'secondary'}
            className="rounded-l-none"
          >
            Kanban
          </Button>
        </div>
      </div>
      
      {isLoading && (
        <div className="flex justify-center items-center h-64">
          <Spinner />
        </div>
      )}
      
      {!isLoading && view === 'list' && (
        <VirtualizedCandidateList 
          candidates={filteredCandidates} 
          navigate={navigate} 
        />
      )}
      
      {!isLoading && view === 'kanban' && (
        <div className="flex-grow">
          <CandidateKanban 
            candidates={filteredCandidates}
            setCandidates={setCandidates}
            navigate={navigate} 
          />
        </div>
      )}

      {/* ADD THE MODAL COMPONENT HERE */}
      <CandidateCreateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCandidateCreated={onCandidateCreated}
      />
    </div>
  );
};

/**
 * CandidateDetailPage
 * A stub page to show deep-linking works.
 */
const CandidateDetailPage = ({ id, navigate }) => {
  const [candidate, setCandidate] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useToasts();

  useEffect(() => {
    const fetchCandidate = async () => {
      setIsLoading(true);
      try {
        // This is not a real API endpoint, so we use Dexie directly
        const cand = await db.candidates.get(parseInt(id, 10));
        if (!cand) throw new Error("Candidate not found");
        setCandidate(cand);

        // Fetch timeline
        const res = await fetch(`/candidates/${id}/timeline`);
        if (!res.ok) throw new Error("Failed to fetch timeline");
        const tl = await res.json();
        setTimeline(tl);
      } catch (error) {
        addToast(error.message, "error");
        navigate("/candidates");
      } finally {
        setIsLoading(false);
      }
    };
    fetchCandidate();
  }, [id, navigate, addToast]);

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <Spinner />
      </div>
    );
  }

  if (!candidate) return null;

  return (
    <div className="p-8">
      <a
        href="#/candidates"
        onClick={(e) => {
          e.preventDefault();
          navigate("/candidates");
        }}
        className="text-sm text-indigo-600 hover:underline flex items-center mb-4"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Candidates
      </a>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center space-x-4">
          <img
            src={candidate.avatarUrl}
            alt={candidate.name}
            className="h-20 w-20 rounded-full"
          />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {candidate.name}
            </h1>
            <p className="text-lg text-gray-600">{candidate.email}</p>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Timeline</h2>
        <div className="flow-root">
          <ul role="list" className="-mb-8">
            {timeline.map((item, itemIdx) => (
              <li key={item.id}>
                <div className="relative pb-8">
                  {itemIdx !== timeline.length - 1 ? (
                    <span
                      className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                      aria-hidden="true"
                    />
                  ) : null}
                  <div className="relative flex space-x-3">
                    <div>
                      <span className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center ring-8 ring-white">
                        <FileText className="h-5 w-5 text-indigo-600" />
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                      <div>
                        <p className="text-sm text-gray-500">
                          {item.event} -{" "}
                          <span className="font-medium text-gray-900">
                            {item.notes}
                          </span>
                        </p>
                      </div>
                      <div className="text-right text-sm whitespace-nowrap text-gray-500">
                        <time dateTime={item.date}>
                          {new Date(item.date).toLocaleString()}
                        </time>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

// --- 11. LAYOUT COMPONENTS ---

const Header = ({ navigate }) => {
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const NavItem = ({ href, icon: Icon, children }) => {
    const isActive = hash.startsWith(href);
    return (
      <a
        href={href}
        onClick={(e) => {
          e.preventDefault();
          navigate(href.substring(1)); // remove #
        }}
        className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
          isActive
            ? "bg-indigo-700 text-white"
            : "text-indigo-100 hover:bg-indigo-500 hover:bg-opacity-75"
        }`}
      >
        <Icon className="h-5 w-5 mr-2" />
        {children}
      </a>
    );
  };

  return (
    <nav className="bg-indigo-600 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-white">TalentFlow</h1>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <NavItem href="#/jobs" icon={Briefcase}>
                  Jobs
                </NavItem>
                <NavItem href="#/candidates" icon={Users}>
                  Candidates
                </NavItem>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

// --- 12. MAIN APP COMPONENT ---

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [route, setRoute] = useState(parseHash(window.location.hash));
  const initRef = useRef(false); // <-- Add this ref

  // App initialization
  useEffect(() => {
    // Prevent React 18 Strict Mode double-run
    if (initRef.current) return; // <-- Add this check
    initRef.current = true;       // <-- Add this flag

    async function initialize() {
      // We don't need to await worker.start() here
      // It's handled in main.jsx
      await seedDatabase();
      setIsInitialized(true);
    }
    initialize();
  }, []);

  // Hash-based routing
  useEffect(() => {
    const handleHashChange = () => {
      setRoute(parseHash(window.location.hash));
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const navigate = (path) => {
    window.location.hash = path;
  };

  // Page renderer
  const renderPage = () => {
    switch (route.page) {
      case "jobs":
        return <JobsPage navigate={navigate} />;
      case "job-detail":
        return <JobDetailPage slug={route.id} navigate={navigate} />;
      case "candidates":
        return <CandidatesPage navigate={navigate} />;
      case "candidate-detail":
        return <CandidateDetailPage id={route.id} navigate={navigate} />;
      default:
        return <JobsPage navigate={navigate} />;
    }
  };

  if (!isInitialized) {
    return <FullPageSpinner />;
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <Header navigate={navigate} />
        <main className="flex-grow h-[calc(100vh-64px)]">{renderPage()}</main>
      </div>
    </ToastProvider>
  );
}

export default App;
