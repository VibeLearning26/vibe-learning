/**
 * DoubtHub Project Manager — Core Engine
 * ==========================================
 * - OpenRouter AI integration for task division
 * - Supabase for data persistence
 * - Proof submission (image, document, URL)
 * - Scoring engine
 * - State management with localStorage fallback
 */

// ============================================
// 1. Configuration
// ============================================
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = ''; // User should set their OpenRouter API key here

const SUPABASE_URL = 'https://fgdmxuslojnbyzeaweyd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_T0xMYGMk2MyqEeGw_3QPeg_jr2YfCJR';

const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const ROLE_LABELS = {
  'project-builder': '🏗️ Project Builder',
  'meeting-arrangement': '📅 Meeting Arrangement',
  'social-media-wing': '📱 Social Media Wing',
};

const STORAGE_KEY = 'doubthub-projects';
const SCORES_KEY = 'doubthub-scores';

// ============================================
// 2. State
// ============================================
let allProjects = [];
let activeProject = null;
let currentProofTaskIndex = null;
let proofFileData = null;
let editingTaskIndex = null;

// ============================================
// 3. DOM References
// ============================================
const DOM = {
  // Create Form
  projectForm: () => document.getElementById('pm-project-form'),
  projectName: () => document.getElementById('pm-project-name'),
  roleSelect: () => document.getElementById('pm-role-select'),
  creatorName: () => document.getElementById('pm-creator-name'),
  projectIdea: () => document.getElementById('pm-project-idea'),
  extraDescription: () => document.getElementById('pm-extra-description'),
  resources: () => document.getElementById('pm-resources'),
  formError: () => document.getElementById('pm-form-error'),
  formSuccess: () => document.getElementById('pm-form-success'),
  analyzeBtn: () => document.getElementById('pm-analyze-btn'),
  createFormCard: () => document.getElementById('pm-create-form-card'),

  // Join Form
  joinFormCard: () => document.getElementById('pm-join-form-card'),
  joinForm: () => document.getElementById('pm-join-form'),
  joinCode: () => document.getElementById('pm-join-code'),
  joinName: () => document.getElementById('pm-join-name'),
  joinError: () => document.getElementById('pm-join-error'),
  joinSuccess: () => document.getElementById('pm-join-success'),
  joinBtn: () => document.getElementById('pm-join-btn'),

  // Mode Tabs
  modeTabs: () => document.getElementById('pm-mode-tabs'),
  tabCreate: () => document.getElementById('pm-tab-create'),
  tabJoin: () => document.getElementById('pm-tab-join'),

  // Share Card
  shareCard: () => document.getElementById('pm-share-card'),
  shareCodeValue: () => document.getElementById('pm-share-code-value'),
  copyCodeBtn: () => document.getElementById('pm-copy-code-btn'),
  shareCopied: () => document.getElementById('pm-share-copied'),
  continueRoadmapBtn: () => document.getElementById('pm-continue-roadmap-btn'),

  // Sections
  submitSection: () => document.getElementById('pm-submit-section'),
  loadingSection: () => document.getElementById('pm-loading-section'),
  roadmapSection: () => document.getElementById('pm-roadmap-section'),
  dashboardSection: () => document.getElementById('pm-dashboard-section'),
  projectsSection: () => document.getElementById('pm-projects-section'),

  // Loading Steps
  loadStep1: () => document.getElementById('pm-load-step-1'),
  loadStep2: () => document.getElementById('pm-load-step-2'),
  loadStep3: () => document.getElementById('pm-load-step-3'),

  // Roadmap
  timeline: () => document.getElementById('pm-timeline'),
  infoProjectName: () => document.getElementById('pm-info-project-name'),
  infoRole: () => document.getElementById('pm-info-role'),
  infoTotalTasks: () => document.getElementById('pm-info-total-tasks'),

  // Dashboard
  progressPercent: () => document.getElementById('pm-progress-percent'),
  ringFill: () => document.getElementById('pm-ring-fill'),
  dashCompleted: () => document.getElementById('pm-dash-completed-value'),
  dashPending: () => document.getElementById('pm-dash-pending-value'),
  dashPoints: () => document.getElementById('pm-dash-points-value'),

  // Projects List
  projectsList: () => document.getElementById('pm-projects-list'),
  emptyState: () => document.getElementById('pm-empty-state'),

  // Proof Modal
  proofModal: () => document.getElementById('pm-proof-modal'),
  modalClose: () => document.getElementById('pm-modal-close'),
  modalTaskName: () => document.getElementById('pm-modal-task-name'),
  proofTabs: () => document.getElementById('pm-proof-tabs'),
  proofImageZone: () => document.getElementById('pm-proof-image-zone'),
  proofUrlZone: () => document.getElementById('pm-proof-url-zone'),
  proofDocZone: () => document.getElementById('pm-proof-doc-zone'),
  dropZone: () => document.getElementById('pm-drop-zone'),
  fileInput: () => document.getElementById('pm-file-input'),
  imagePreview: () => document.getElementById('pm-image-preview'),
  previewImg: () => document.getElementById('pm-preview-img'),
  removePreview: () => document.getElementById('pm-remove-preview'),
  proofUrlInput: () => document.getElementById('pm-proof-url-input'),
  docDropZone: () => document.getElementById('pm-doc-drop-zone'),
  docFileInput: () => document.getElementById('pm-doc-file-input'),
  docPreview: () => document.getElementById('pm-doc-preview'),
  docName: () => document.getElementById('pm-doc-name'),
  removeDocPreview: () => document.getElementById('pm-remove-doc-preview'),
  proofNotes: () => document.getElementById('pm-proof-notes'),
  modalError: () => document.getElementById('pm-modal-error'),
  modalSuccess: () => document.getElementById('pm-modal-success'),
  submitProofBtn: () => document.getElementById('pm-submit-proof-btn'),
};

// ============================================
// 4. Initialization
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  loadProjects();
  renderProjectsList();
  initModeTabs();
  initFormHandler();
  initJoinHandler();
  initShareCard();
  initProofModal();
  initNavbar();
  initScrollAnimations();
  checkUrlForCode();
  initAuthListener();
});

function initAuthListener() {
  const loginBtn = document.getElementById('login-nav-btn');
  if (!loginBtn || !supabaseClient) return;

  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (session) {
      // User is logged in
      loginBtn.textContent = 'Logout';
      loginBtn.href = '#';
      loginBtn.onclick = async (e) => {
        e.preventDefault();
        await supabaseClient.auth.signOut();
        window.location.reload();
      };
    } else {
      // User is logged out
      loginBtn.textContent = 'Login';
      loginBtn.href = 'auth.html';
      loginBtn.onclick = null;
    }
  });
}

function initNavbar() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  const handleScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  };
  handleScroll();
  window.addEventListener('scroll', handleScroll, { passive: true });

  // Mobile menu toggle
  const navToggle = document.getElementById('nav-toggle-btn');
  const navMenu = document.getElementById('nav-menu-list');
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.classList.toggle('active');
      navMenu.classList.toggle('active');
      navToggle.setAttribute('aria-expanded', !isExpanded);
      navMenu.setAttribute('aria-hidden', isExpanded);
      document.body.style.overflow = isExpanded ? '' : 'hidden';
      const icon = navToggle.querySelector('i');
      if (icon) {
        icon.setAttribute('data-lucide', isExpanded ? 'menu' : 'x');
        if (window.lucide) lucide.createIcons();
      }
    });
  }
}

function initScrollAnimations() {
  const revealElements = document.querySelectorAll('.reveal-fade-up');
  if (revealElements.length === 0) return;

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          obs.unobserve(entry.target);
        }
      });
    },
    { root: null, rootMargin: '0px 0px -80px 0px', threshold: 0.1 }
  );

  revealElements.forEach((el) => observer.observe(el));
}

// ============================================
// 5. Supabase Persistence
// ============================================
const CODES_KEY = 'doubthub-project-codes';

async function loadProjects() {
  let savedCodes = [];
  try {
    const data = localStorage.getItem(CODES_KEY);
    savedCodes = data ? JSON.parse(data) : [];
  } catch {
    savedCodes = [];
  }

  if (savedCodes.length === 0) {
    allProjects = [];
    renderProjectsList();
    return;
  }

  if (!supabaseClient) {
    console.error('Supabase client not initialized.');
    return;
  }

  try {
    // Fetch projects from Supabase that match the saved codes
    const { data, error } = await supabaseClient
      .from('projects')
      .select('*')
      .in('share_code', savedCodes)
      .order('created_at', { ascending: false });

    if (error) throw error;
    allProjects = data || [];
    renderProjectsList();
  } catch (err) {
    console.error('Error loading projects from Supabase:', err);
  }
}

async function saveProjectToDb(project) {
  if (!supabaseClient) return;

  try {
    const { error } = await supabaseClient
      .from('projects')
      .update({
        tasks: project.tasks,
        members: project.members
      })
      .eq('id', project.id);

    if (error) throw error;
    
    // Update local state
    const idx = allProjects.findIndex(p => p.id === project.id);
    if (idx !== -1) allProjects[idx] = project;
    
    updateScoreboard(project);
  } catch (err) {
    console.error('Error saving project to Supabase:', err);
  }
}

function saveJoinedCode(code) {
  let savedCodes = [];
  try {
    const data = localStorage.getItem(CODES_KEY);
    savedCodes = data ? JSON.parse(data) : [];
  } catch {
    savedCodes = [];
  }

  if (!savedCodes.includes(code)) {
    savedCodes.push(code);
    localStorage.setItem(CODES_KEY, JSON.stringify(savedCodes));
  }
}

function removeJoinedCode(code) {
  let savedCodes = [];
  try {
    const data = localStorage.getItem(CODES_KEY);
    savedCodes = data ? JSON.parse(data) : [];
    savedCodes = savedCodes.filter(c => c !== code);
    localStorage.setItem(CODES_KEY, JSON.stringify(savedCodes));
  } catch {
    // ignore
  }
}

function updateScoreboard(project = activeProject) {
  if (!project) return;

  const completed = project.tasks.filter((t) => t.status === 'completed').length;
  const total = project.tasks.length;
  const points = calculatePoints(project);

  const scoreData = {
    projectId: project.id,
    projectName: project.name,
    role: project.role,
    roleLabel: ROLE_LABELS[project.role] || project.role,
    totalPoints: points,
    tasksCompleted: completed,
    totalTasks: total,
    completionRate: total > 0 ? Math.round((completed / total) * 1000) / 10 : 0,
    lastUpdated: new Date().toISOString(),
  };

  localStorage.setItem(SCORES_KEY, JSON.stringify(scoreData));

  // Dispatch custom event for live scoreboard integration
  window.dispatchEvent(new CustomEvent('scoreboard-update', { detail: scoreData }));
}

// ============================================
// 6. Scoring Engine
// ============================================
function calculatePoints(project) {
  let points = 0;
  const tasks = project.tasks || [];

  tasks.forEach((task) => {
    if (task.status === 'completed') {
      // Base points for completion
      points += 100;

      // Bonus for having proof
      if (task.proof) {
        points += 25;
      }
    }
  });

  // Bonus for completing all tasks
  const allCompleted = tasks.length > 0 && tasks.every((t) => t.status === 'completed');
  if (allCompleted) {
    points += 200;
  }

  return points;
}

// ============================================
// 7. Mode Tabs (Create / Join)
// ============================================
function initModeTabs() {
  const modeTabs = DOM.modeTabs();
  if (!modeTabs) return;

  modeTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.pm-mode-tab');
    if (!tab) return;

    const mode = tab.dataset.mode;

    // Toggle active tab
    document.querySelectorAll('.pm-mode-tab').forEach((t) => {
      t.classList.toggle('active', t === tab);
    });

    // Show/hide forms
    if (mode === 'create') {
      DOM.createFormCard().style.display = 'block';
      DOM.joinFormCard().style.display = 'none';
    } else {
      DOM.createFormCard().style.display = 'none';
      DOM.joinFormCard().style.display = 'block';
    }

    // Hide share card if visible
    DOM.shareCard().style.display = 'none';

    clearMessages();
    if (window.lucide) lucide.createIcons();
  });
}

// ============================================
// 7b. Share Code System
// ============================================
function generateShareCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'DH-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function initShareCard() {
  // Copy button
  DOM.copyCodeBtn()?.addEventListener('click', () => {
    const code = DOM.shareCodeValue()?.textContent || '';
    navigator.clipboard.writeText(code).then(() => {
      const copied = DOM.shareCopied();
      if (copied) {
        copied.style.display = 'flex';
        setTimeout(() => { copied.style.display = 'none'; }, 2000);
      }
    }).catch(() => {
      // Fallback: select text
      const el = DOM.shareCodeValue();
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    });
    if (window.lucide) lucide.createIcons();
  });

  // Continue to roadmap button
  DOM.continueRoadmapBtn()?.addEventListener('click', () => {
    if (activeProject) {
      DOM.shareCard().style.display = 'none';
      DOM.modeTabs()?.closest('.pm-mode-tabs')?.parentElement && (DOM.modeTabs().style.display = 'none');
      showRoadmap(activeProject);
      showDashboard(activeProject);
      DOM.projectsSection().style.display = 'none';
    }
  });
}

function showShareCode(project) {
  DOM.createFormCard().style.display = 'none';
  DOM.joinFormCard().style.display = 'none';
  DOM.modeTabs().style.display = 'none';
  DOM.shareCard().style.display = 'block';
  DOM.shareCodeValue().textContent = project.shareCode;
  DOM.shareCopied().style.display = 'none';
  if (window.lucide) lucide.createIcons();

  DOM.shareCard().scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ============================================
// 7c. Join Form Handler
// ============================================
function initJoinHandler() {
  const form = DOM.joinForm();
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();

    const code = DOM.joinCode().value.trim().toUpperCase();
    const name = DOM.joinName().value.trim();

    if (!code) {
      showMsg(DOM.joinError(), 'Please enter a Project Code.');
      return;
    }
    if (!name) {
      showMsg(DOM.joinError(), 'Please enter your name.');
      return;
    }

    if (!supabaseClient) {
      showMsg(DOM.joinError(), 'Supabase client not connected. Please check configuration.');
      return;
    }

    const btn = DOM.joinBtn();
    setLoading(btn, true, 'Joining...');

    try {
      // 1. Fetch project by share code
      const { data: projects, error: fetchError } = await supabaseClient
        .from('projects')
        .select('*')
        .eq('share_code', code);

      if (fetchError) throw fetchError;

      if (!projects || projects.length === 0) {
        showMsg(DOM.joinError(), `No project found with code "${code}". Please check the code and try again.`);
        setLoading(btn, false);
        return;
      }

      const project = projects[0];

      // 2. Add member if not already in list
      let members = Array.isArray(project.members) ? project.members : [];
      if (!members.find((m) => m.name.toLowerCase() === name.toLowerCase())) {
        members.push({ name, joinedAt: new Date().toISOString() });
        
        const { error: updateError } = await supabaseClient
          .from('projects')
          .update({ members })
          .eq('id', project.id);
          
        if (updateError) throw updateError;
        project.members = members;
      }

      // 3. Save code locally to show in list
      saveJoinedCode(code);
      
      // Update local array if not there
      const existingIdx = allProjects.findIndex(p => p.share_code === code);
      if (existingIdx === -1) {
        allProjects.push(project);
      } else {
        allProjects[existingIdx] = project;
      }

      showMsg(DOM.joinSuccess(), `Successfully joined "${project.name}"! Loading roadmap...`);

      setTimeout(() => {
        activeProject = project;
        DOM.submitSection().style.display = 'none';
        showRoadmap(project);
        showDashboard(project);
        DOM.projectsSection().style.display = 'none';
        setLoading(btn, false);
      }, 1200);

    } catch (err) {
      console.error('Error joining project:', err);
      showMsg(DOM.joinError(), 'An error occurred while joining. Please try again.');
      setLoading(btn, false);
    }
  });
}

function checkUrlForCode() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (code) {
    // Auto-switch to join tab and fill in code
    DOM.tabJoin()?.click();
    setTimeout(() => {
      const joinCodeInput = DOM.joinCode();
      if (joinCodeInput) {
        joinCodeInput.value = code.toUpperCase();
      }
    }, 100);
  }
}

// ============================================
// 7d. Create Form Handler
// ============================================
function initFormHandler() {
  const form = DOM.projectForm();
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();

    const name = DOM.projectName().value.trim();
    const role = DOM.roleSelect().value;
    const creatorName = DOM.creatorName().value.trim();
    const idea = DOM.projectIdea().value.trim();
    const extra = DOM.extraDescription().value.trim();
    const resources = DOM.resources().value.trim();

    if (!name) {
      showMsg(DOM.formError(), 'Please enter a project name.');
      return;
    }
    if (!role) {
      showMsg(DOM.formError(), 'Please select your role.');
      return;
    }
    if (!creatorName) {
      showMsg(DOM.formError(), 'Please enter your name.');
      return;
    }
    if (!idea) {
      showMsg(DOM.formError(), 'Please describe your project idea.');
      return;
    }

    // Start analysis
    await analyzeAndGenerateRoadmap({ name, role, creatorName, idea, extra, resources });
  });
}

// ============================================
// 8. AI Task Division Engine (OpenRouter)
// ============================================
async function analyzeAndGenerateRoadmap({ name, role, creatorName, idea, extra, resources }) {
  const btn = DOM.analyzeBtn();
  setLoading(btn, true, 'Analyzing...');

  // Show loading section
  DOM.submitSection().style.display = 'none';
  DOM.loadingSection().style.display = 'block';
  DOM.projectsSection().style.display = 'none';

  // Animate loading steps
  await animateLoadingSteps();

  let tasks;

  try {
    if (OPENROUTER_API_KEY) {
      tasks = await generateTasksWithAI(name, role, idea, extra, resources);
    } else {
      // Fallback to smart heuristic engine
      tasks = generateTasksHeuristic(name, role, idea, extra);
    }
  } catch (err) {
    console.error('AI generation failed, falling back to heuristic:', err);
    tasks = generateTasksHeuristic(name, role, idea, extra);
  }

  // Generate share code for teammates
  const shareCode = generateShareCode();

  // Create project object (omit ID so Supabase generates UUID)
  const newProject = {
    share_code: shareCode,
    name,
    role,
    creator_name: creatorName || 'Creator',
    idea,
    extra,
    resources,
    tasks,
    members: [{ name: creatorName || 'Creator', joinedAt: new Date().toISOString(), isCreator: true }]
  };

  try {
    if (!supabaseClient) throw new Error('Supabase client not connected');

    // 1. Insert into Supabase
    const { data, error } = await supabaseClient
      .from('projects')
      .insert([newProject])
      .select();

    if (error) throw error;
    
    const savedProject = data[0];

    // 2. Save code locally
    saveJoinedCode(shareCode);
    allProjects.unshift(savedProject);
    
    // Set as active
    activeProject = savedProject;
    DOM.loadingSection().style.display = 'none';

    // Show Share Code card first (so creator can share with teammates)
    DOM.submitSection().style.display = 'block';
    showShareCode(savedProject);

    // Reset form
    DOM.projectForm().reset();
    setLoading(btn, false);
    renderProjectsList();

  } catch (err) {
    console.error('Error saving project to Supabase:', err);
    alert('Failed to save project to database. Please check your Supabase connection.');
    DOM.loadingSection().style.display = 'none';
    DOM.submitSection().style.display = 'block';
    setLoading(btn, false);
  }
}

async function animateLoadingSteps() {
  const steps = [DOM.loadStep1(), DOM.loadStep2(), DOM.loadStep3()];

  if (window.lucide) lucide.createIcons();

  for (let i = 0; i < steps.length; i++) {
    await delay(600);
    if (steps[i]) {
      steps[i].classList.add('active');
    }
    if (i > 0 && steps[i - 1]) {
      steps[i - 1].classList.remove('active');
      steps[i - 1].classList.add('done');
    }
  }
  await delay(800);
  if (steps[2]) {
    steps[2].classList.remove('active');
    steps[2].classList.add('done');
  }
}

async function generateTasksWithAI(name, role, idea, extra, resources) {
  const roleLabel = ROLE_LABELS[role] || role;

  const systemPrompt = `You are a project management AI assistant. Given a project idea and team role, divide the project into 5-8 manageable task phases as a structured roadmap.

Each task should include:
- title: Short task name
- description: 1-2 sentence description of what to do
- proofType: What kind of proof is needed ("image", "url", "document", or "any")
- estimatedHours: Estimated hours to complete (number)

Respond ONLY with a valid JSON array of task objects. No markdown, no code fences, no explanation. Just the raw JSON array.

Example format:
[{"title":"Research & Planning","description":"Research the requirements and create a detailed plan.","proofType":"document","estimatedHours":4}]`;

  const userPrompt = `Project Name: ${name}
Role: ${roleLabel}
Project Idea: ${idea}
${extra ? `Additional Details: ${extra}` : ''}
${resources ? `Reference Resources: ${resources}` : ''}

Generate a roadmap of tasks for this project based on the "${roleLabel}" role. Tasks should be specific to what a ${roleLabel} would need to do.`;

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin || 'https://doubthub.io',
      'X-Title': 'DoubtHub Project Manager',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4.1-nano:free',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  // Parse JSON from response (handle possible markdown wrapping)
  let jsonStr = content.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
  }

  const rawTasks = JSON.parse(jsonStr);

  // Normalize tasks
  return rawTasks.map((t, i) => ({
    id: `task-${i + 1}`,
    title: t.title || `Phase ${i + 1}`,
    description: t.description || '',
    proofType: t.proofType || 'any',
    estimatedHours: t.estimatedHours || 4,
    status: 'pending',
    proof: null,
    proofNotes: '',
    completedAt: null,
  }));
}

function generateTasksHeuristic(name, role, idea, extra) {
  const templates = {
    'project-builder': [
      {
        title: 'Requirements Analysis',
        description: 'Analyze the project requirements, define scope, identify deliverables and constraints.',
        proofType: 'document',
        estimatedHours: 3,
      },
      {
        title: 'UI/UX Design & Wireframing',
        description: 'Create wireframes, mockups, and design prototypes for the project interface.',
        proofType: 'image',
        estimatedHours: 6,
      },
      {
        title: 'Frontend Development',
        description: 'Build the user-facing interface with responsive design and interactive components.',
        proofType: 'url',
        estimatedHours: 12,
      },
      {
        title: 'Backend / Logic Implementation',
        description: 'Implement core business logic, APIs, and data processing modules.',
        proofType: 'url',
        estimatedHours: 10,
      },
      {
        title: 'Testing & Bug Fixes',
        description: 'Perform comprehensive testing, fix bugs, and ensure cross-browser compatibility.',
        proofType: 'image',
        estimatedHours: 5,
      },
      {
        title: 'Deployment & Documentation',
        description: 'Deploy the project to production and write comprehensive documentation.',
        proofType: 'url',
        estimatedHours: 4,
      },
      {
        title: 'Final Review & Handoff',
        description: 'Conduct final review, prepare presentation, and hand off to stakeholders.',
        proofType: 'document',
        estimatedHours: 2,
      },
    ],
    'meeting-arrangement': [
      {
        title: 'Venue & Platform Research',
        description: 'Research and shortlist suitable venues or virtual platforms for the meeting/event.',
        proofType: 'document',
        estimatedHours: 3,
      },
      {
        title: 'Schedule & Agenda Planning',
        description: 'Create detailed schedule, set agenda items, and allocate time slots for each topic.',
        proofType: 'document',
        estimatedHours: 2,
      },
      {
        title: 'Invitation & Communication Design',
        description: 'Design and send professional invitations, create event briefs, and set up RSVP.',
        proofType: 'image',
        estimatedHours: 4,
      },
      {
        title: 'RSVP & Attendee Management',
        description: 'Track RSVPs, manage attendee lists, coordinate special requirements.',
        proofType: 'document',
        estimatedHours: 3,
      },
      {
        title: 'Day-of Logistics & Setup',
        description: 'Arrange equipment, test AV setup, prepare materials, coordinate with speakers.',
        proofType: 'image',
        estimatedHours: 5,
      },
      {
        title: 'Post-Event Report',
        description: 'Compile feedback, write event summary report, document action items.',
        proofType: 'document',
        estimatedHours: 3,
      },
    ],
    'social-media-wing': [
      {
        title: 'Content Strategy & Planning',
        description: 'Define target audience, create content strategy, and plan campaign goals.',
        proofType: 'document',
        estimatedHours: 4,
      },
      {
        title: 'Graphic & Visual Design',
        description: 'Design social media graphics, banners, and visual assets for all platforms.',
        proofType: 'image',
        estimatedHours: 6,
      },
      {
        title: 'Content Calendar Creation',
        description: 'Build a detailed posting schedule with dates, platforms, and content types.',
        proofType: 'document',
        estimatedHours: 3,
      },
      {
        title: 'Platform Setup & Optimization',
        description: 'Set up or optimize social media profiles, bios, and branding across platforms.',
        proofType: 'url',
        estimatedHours: 3,
      },
      {
        title: 'Post Scheduling & Publishing',
        description: 'Schedule and publish content according to the content calendar.',
        proofType: 'image',
        estimatedHours: 4,
      },
      {
        title: 'Engagement & Community Management',
        description: 'Monitor comments, respond to messages, engage with audience, build community.',
        proofType: 'image',
        estimatedHours: 5,
      },
      {
        title: 'Analytics Report & Insights',
        description: 'Collect analytics data, create performance report, and identify improvement areas.',
        proofType: 'document',
        estimatedHours: 3,
      },
    ],
  };

  const roleTemplate = templates[role] || templates['project-builder'];

  return roleTemplate.map((t, i) => ({
    id: `task-${i + 1}`,
    title: t.title,
    description: t.description,
    proofType: t.proofType,
    estimatedHours: t.estimatedHours,
    status: 'pending',
    proof: null,
    proofNotes: '',
    completedAt: null,
  }));
}

// ============================================
// 9. Roadmap Rendering
// ============================================
function showRoadmap(project) {
  DOM.roadmapSection().style.display = 'block';
  DOM.submitSection().style.display = 'none';

  // Update info header
  DOM.infoProjectName().textContent = project.name;
  DOM.infoRole().textContent = ROLE_LABELS[project.role] || project.role;
  DOM.infoTotalTasks().textContent = `${project.tasks.length} Phases`;

  renderTimeline(project);

  // Scroll to roadmap
  setTimeout(() => {
    DOM.roadmapSection().scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 300);
}

function renderTimeline(project) {
  const container = DOM.timeline();
  container.innerHTML = '';

  project.tasks.forEach((task, index) => {
    const card = document.createElement('div');
    card.className = `pm-task-card ${task.status === 'completed' ? 'completed' : ''}`;
    card.style.animationDelay = `${index * 0.1}s`;
    card.dataset.taskIndex = index;

    const statusBadge = getStatusBadge(task.status);
    const proofTypeLabel = getProofTypeLabel(task.proofType);

    let actionsHTML = '';

    if (task.status === 'completed') {
      actionsHTML = `
        <button class="pm-task-action-btn pm-btn-completed-label" disabled>
          <i data-lucide="check-circle" aria-hidden="true"></i>
          Completed
        </button>`;
      if (task.proof) {
        actionsHTML += `
          <button class="pm-task-action-btn pm-btn-view-proof" onclick="viewProof(${index})">
            <i data-lucide="eye" aria-hidden="true"></i>
            View Proof
          </button>`;
      }
    } else {
      actionsHTML = `
        <button class="pm-task-action-btn pm-btn-proof" onclick="openProofModal(${index})">
          <i data-lucide="upload" aria-hidden="true"></i>
          Submit Proof
        </button>
        <button class="pm-task-action-btn pm-btn-complete" onclick="completeTask(${index})">
          <i data-lucide="check" aria-hidden="true"></i>
          Mark Complete
        </button>
        <button class="pm-task-action-btn pm-btn-edit" onclick="editTask(${index})">
          <i data-lucide="pencil" aria-hidden="true"></i>
          Edit Task
        </button>`;
    }

    let proofIndicator = '';
    if (task.proof) {
      const proofTime = task.proof.submittedAt
        ? new Date(task.proof.submittedAt).toLocaleDateString()
        : '';
      proofIndicator = `
        <div class="pm-proof-indicator">
          <i data-lucide="shield-check" aria-hidden="true"></i>
          <span>Proof submitted${proofTime ? ` on ${proofTime}` : ''}</span>
        </div>`;
    }

    const isEditing = editingTaskIndex === index;

    if (isEditing) {
      card.innerHTML = `
        <div class="pm-task-node">${index + 1}</div>
        <div class="pm-task-body" style="width: 100%;">
          <div class="pm-task-header" style="flex-direction: column; align-items: flex-start; gap: 0.5rem;">
            <input type="text" id="edit-task-title-${index}" class="pm-input" value="${escapeHTML(task.title)}" style="width: 100%; font-weight: 600;">
          </div>
          <textarea id="edit-task-desc-${index}" class="pm-input pm-textarea" rows="2" style="width: 100%; margin-top: 0.5rem; font-size: 0.95rem;">${escapeHTML(task.description)}</textarea>
          <div class="pm-task-actions" style="margin-top: 1rem; justify-content: flex-start; gap: 1rem;">
            <button class="btn btn-primary" onclick="saveTask(${index})" style="padding: 0.5rem 1rem;">
              <i data-lucide="save" aria-hidden="true"></i> Save
            </button>
            <button class="btn" onclick="cancelEditTask()" style="padding: 0.5rem 1rem; background: var(--glass-bg); border: 1px solid var(--border-glass); color: var(--text-white);">
              <i data-lucide="x" aria-hidden="true"></i> Cancel
            </button>
          </div>
        </div>
      `;
    } else {
      card.innerHTML = `
        <div class="pm-task-node">${index + 1}</div>
        <div class="pm-task-body">
          <div class="pm-task-header">
            <span class="pm-task-title">${escapeHTML(task.title)}</span>
            ${statusBadge}
          </div>
          <p class="pm-task-description">${escapeHTML(task.description)}</p>
          <div class="pm-task-meta">
            <span class="pm-task-meta-item">
              <i data-lucide="clock" aria-hidden="true"></i>
              ~${task.estimatedHours}h estimated
            </span>
            <span class="pm-task-meta-item">
              <i data-lucide="${getProofTypeIcon(task.proofType)}" aria-hidden="true"></i>
              Proof: ${proofTypeLabel}
            </span>
          </div>
          <div class="pm-task-actions">
            ${actionsHTML}
          </div>
          ${proofIndicator}
        </div>
      `;
    }

    container.appendChild(card);
  });

  if (window.lucide) lucide.createIcons();
}

function getStatusBadge(status) {
  const badges = {
    pending: '<span class="pm-task-badge pm-badge-pending">Pending</span>',
    'in-progress':
      '<span class="pm-task-badge pm-badge-in-progress">In Progress</span>',
    completed:
      '<span class="pm-task-badge pm-badge-completed">Completed</span>',
  };
  return badges[status] || badges.pending;
}

function getProofTypeLabel(type) {
  const labels = {
    image: 'Image',
    url: 'URL / Link',
    document: 'Document',
    any: 'Any format',
  };
  return labels[type] || 'Any format';
}

function getProofTypeIcon(type) {
  const icons = {
    image: 'image',
    url: 'link',
    document: 'file-text',
    any: 'paperclip',
  };
  return icons[type] || 'paperclip';
}

// ============================================
// 9b. Edit Task Actions
// ============================================
window.editTask = function (index) {
  editingTaskIndex = index;
  renderTimeline(activeProject);
};

window.cancelEditTask = function () {
  editingTaskIndex = null;
  renderTimeline(activeProject);
};

window.saveTask = async function (index) {
  const titleInput = document.getElementById(`edit-task-title-${index}`);
  const descInput = document.getElementById(`edit-task-desc-${index}`);
  if (!titleInput || !descInput || !activeProject) return;

  const newTitle = titleInput.value.trim();
  const newDesc = descInput.value.trim();

  if (!newTitle || !newDesc) {
    alert('Task title and description cannot be empty.');
    return;
  }

  // Update local state
  activeProject.tasks[index].title = newTitle;
  activeProject.tasks[index].description = newDesc;

  editingTaskIndex = null;
  renderTimeline(activeProject);
  
  // Save to DB
  await saveProjectToDb(activeProject);
};

// ============================================
// 10. Dashboard Rendering
// ============================================
function showDashboard(project) {
  DOM.dashboardSection().style.display = 'block';
  updateDashboard(project);
}

function updateDashboard(project) {
  const tasks = project.tasks || [];
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const pending = tasks.length - completed;
  const percent = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
  const points = calculatePoints(project);

  // Animate progress ring
  const circumference = 326.73; // 2 * π * 52
  const offset = circumference - (percent / 100) * circumference;

  const ringFill = DOM.ringFill();
  if (ringFill) {
    // Add gradient definition if not exists
    const svg = ringFill.closest('svg');
    if (svg && !svg.querySelector('#pm-ring-gradient')) {
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      defs.innerHTML = `
        <linearGradient id="pm-ring-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#38bdf8" />
          <stop offset="100%" style="stop-color:#a855f7" />
        </linearGradient>`;
      svg.prepend(defs);
    }
    ringFill.style.strokeDashoffset = offset;
  }

  DOM.progressPercent().textContent = `${percent}%`;
  DOM.dashCompleted().textContent = completed;
  DOM.dashPending().textContent = pending;
  DOM.dashPoints().textContent = points;
}

// ============================================
// 11. Projects List
// ============================================
function renderProjectsList() {
  const container = DOM.projectsList();
  const emptyState = DOM.emptyState();
  if (!container) return;

  // Clear existing items (except empty state)
  const existingItems = container.querySelectorAll('.pm-project-list-item');
  existingItems.forEach((item) => item.remove());

  if (allProjects.length === 0) {
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  allProjects.forEach((project, index) => {
    const tasks = Array.isArray(project.tasks) ? project.tasks : [];
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const total = tasks.length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    const item = document.createElement('div');
    item.className = 'pm-project-list-item';
    item.onclick = (e) => {
      if (e.target.closest('.pm-project-delete-btn')) return;
      loadProject(index);
    };

    item.innerHTML = `
      <div class="pm-project-list-left">
        <div class="pm-project-list-icon">
          <i data-lucide="folder" aria-hidden="true"></i>
        </div>
        <div class="pm-project-list-info">
          <div class="pm-project-list-name">${escapeHTML(project.name)}</div>
          <div class="pm-project-list-meta">
            <span>${ROLE_LABELS[project.role] || project.role}</span>
            <span>${completed}/${total} tasks</span>
            <span style="color:var(--accent-blue);font-family:var(--font-heading);">Code: ${project.share_code || '—'}</span>
          </div>
        </div>
      </div>
      <div class="pm-project-list-right">
        <div class="pm-project-progress-mini">
          <div class="pm-project-progress-mini-fill" style="width: ${percent}%"></div>
        </div>
        <button class="pm-project-delete-btn" onclick="deleteProject(${index}, event)" title="Leave project">
          <i data-lucide="trash-2" aria-hidden="true"></i>
        </button>
        <div class="pm-project-list-arrow">
          <i data-lucide="chevron-right" aria-hidden="true"></i>
        </div>
      </div>
    `;

    container.appendChild(item);
  });

  if (window.lucide) lucide.createIcons();
}

function loadProject(index) {
  activeProject = allProjects[index];
  if (!activeProject) return;

  DOM.submitSection().style.display = 'none';
  DOM.loadingSection().style.display = 'none';
  showRoadmap(activeProject);
  showDashboard(activeProject);
  DOM.projectsSection().style.display = 'none';
}

function deleteProject(index, event) {
  event.stopPropagation();

  if (!confirm('Are you sure you want to leave this project? (It will be removed from your list, but remains for other teammates)')) return;

  const project = allProjects[index];
  if (project) {
    removeJoinedCode(project.share_code);
  }

  allProjects.splice(index, 1);

  // If deleted the active project
  if (activeProject && activeProject.id === project.id) {
    activeProject = null;
    DOM.roadmapSection().style.display = 'none';
    DOM.dashboardSection().style.display = 'none';
    DOM.submitSection().style.display = 'block';
  }

  renderProjectsList();
}

// Make global for inline onclick
window.deleteProject = deleteProject;

// ============================================
// 12. Task Actions
// ============================================
function completeTask(taskIndex) {
  if (!activeProject) return;

  const task = activeProject.tasks[taskIndex];
  if (!task) return;

  task.status = 'completed';
  task.completedAt = new Date().toISOString();

  saveProjectToDb(activeProject);
  renderTimeline(activeProject);
  updateDashboard(activeProject);
  renderProjectsList();
}

function viewProof(taskIndex) {
  if (!activeProject) return;

  const task = activeProject.tasks[taskIndex];
  if (!task || !task.proof) return;

  const proof = task.proof;

  if (proof.type === 'url' && proof.url) {
    window.open(proof.url, '_blank');
  } else if (proof.type === 'image' && proof.data) {
    // Open image in new window
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`
        <html><head><title>Proof - ${escapeHTML(task.title)}</title>
        <style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0f172a;}
        img{max-width:90vw;max-height:90vh;border-radius:12px;box-shadow:0 20px 50px rgba(0,0,0,.6);}</style></head>
        <body><img src="${proof.data}" alt="Proof"></body></html>`);
    }
  } else if (proof.type === 'document' && proof.data) {
    // Download document
    const link = document.createElement('a');
    link.href = proof.data;
    link.download = proof.fileName || 'proof-document';
    link.click();
  }
}

// Make global for inline onclick
window.completeTask = completeTask;
window.viewProof = viewProof;
window.openProofModal = openProofModal;

// ============================================
// 13. Proof Modal
// ============================================
function initProofModal() {
  // Close modal
  DOM.modalClose()?.addEventListener('click', closeProofModal);

  DOM.proofModal()?.addEventListener('click', (e) => {
    if (e.target === DOM.proofModal()) closeProofModal();
  });

  // Escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeProofModal();
  });

  // Tab switching
  DOM.proofTabs()?.addEventListener('click', (e) => {
    const tab = e.target.closest('.pm-proof-tab');
    if (!tab) return;

    const type = tab.dataset.type;
    switchProofTab(type);
  });

  // Image drop zone
  const dropZone = DOM.dropZone();
  const fileInput = DOM.fileInput();

  if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file, 'image');
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files[0]) handleFileUpload(e.target.files[0], 'image');
    });
  }

  // Document drop zone
  const docDropZone = DOM.docDropZone();
  const docFileInput = DOM.docFileInput();

  if (docDropZone && docFileInput) {
    docDropZone.addEventListener('click', () => docFileInput.click());

    docDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      docDropZone.classList.add('drag-over');
    });

    docDropZone.addEventListener('dragleave', () => {
      docDropZone.classList.remove('drag-over');
    });

    docDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      docDropZone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file, 'document');
    });

    docFileInput.addEventListener('change', (e) => {
      if (e.target.files[0]) handleFileUpload(e.target.files[0], 'document');
    });
  }

  // Remove preview
  DOM.removePreview()?.addEventListener('click', () => {
    proofFileData = null;
    DOM.imagePreview().style.display = 'none';
    DOM.dropZone().style.display = 'block';
  });

  DOM.removeDocPreview()?.addEventListener('click', () => {
    proofFileData = null;
    DOM.docPreview().style.display = 'none';
    DOM.docDropZone().style.display = 'block';
  });

  // Submit proof
  DOM.submitProofBtn()?.addEventListener('click', submitProof);
}

function openProofModal(taskIndex) {
  currentProofTaskIndex = taskIndex;
  proofFileData = null;

  if (!activeProject) return;

  const task = activeProject.tasks[taskIndex];
  if (!task) return;

  DOM.modalTaskName().textContent = `Task: ${task.title}`;

  // Reset modal state
  DOM.imagePreview().style.display = 'none';
  DOM.dropZone().style.display = 'block';
  DOM.docPreview().style.display = 'none';
  DOM.docDropZone().style.display = 'block';
  DOM.proofUrlInput().value = '';
  DOM.proofNotes().value = '';
  DOM.modalError().style.display = 'none';
  DOM.modalSuccess().style.display = 'none';

  // Switch to recommended proof tab
  switchProofTab(task.proofType === 'any' ? 'image' : task.proofType);

  DOM.proofModal().style.display = 'flex';
  document.body.style.overflow = 'hidden';

  if (window.lucide) lucide.createIcons();
}

function closeProofModal() {
  DOM.proofModal().style.display = 'none';
  document.body.style.overflow = '';
  currentProofTaskIndex = null;
  proofFileData = null;
}

function switchProofTab(type) {
  // Update tabs
  const tabs = document.querySelectorAll('.pm-proof-tab');
  tabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.type === type);
  });

  // Show/hide zones
  DOM.proofImageZone().style.display = type === 'image' ? 'block' : 'none';
  DOM.proofUrlZone().style.display = type === 'url' ? 'block' : 'none';
  DOM.proofDocZone().style.display = type === 'document' ? 'block' : 'none';
}

function handleFileUpload(file, type) {
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (file.size > maxSize) {
    showMsg(DOM.modalError(), 'File is too large. Maximum size is 5MB.');
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    proofFileData = {
      data: reader.result,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    };

    if (type === 'image') {
      DOM.previewImg().src = reader.result;
      DOM.imagePreview().style.display = 'block';
      DOM.dropZone().style.display = 'none';
    } else {
      DOM.docName().textContent = file.name;
      DOM.docPreview().style.display = 'flex';
      DOM.docDropZone().style.display = 'none';
    }
  };
  reader.readAsDataURL(file);
}

function submitProof() {
  if (currentProofTaskIndex === null || !activeProject) return;

  DOM.modalError().style.display = 'none';
  DOM.modalSuccess().style.display = 'none';

  const activeTab = document.querySelector('.pm-proof-tab.active');
  const proofType = activeTab?.dataset.type || 'image';

  let proof = null;

  if (proofType === 'image') {
    if (!proofFileData) {
      showMsg(DOM.modalError(), 'Please upload an image as proof.');
      return;
    }
    proof = {
      type: 'image',
      data: proofFileData.data,
      fileName: proofFileData.fileName,
      submittedAt: new Date().toISOString(),
    };
  } else if (proofType === 'url') {
    const url = DOM.proofUrlInput().value.trim();
    if (!url) {
      showMsg(DOM.modalError(), 'Please enter a URL.');
      return;
    }
    try {
      new URL(url);
    } catch {
      showMsg(DOM.modalError(), 'Please enter a valid URL.');
      return;
    }
    proof = {
      type: 'url',
      url,
      submittedAt: new Date().toISOString(),
    };
  } else if (proofType === 'document') {
    if (!proofFileData) {
      showMsg(DOM.modalError(), 'Please upload a document as proof.');
      return;
    }
    proof = {
      type: 'document',
      data: proofFileData.data,
      fileName: proofFileData.fileName,
      submittedAt: new Date().toISOString(),
    };
  }

  // Save proof
  const task = activeProject.tasks[currentProofTaskIndex];
  task.proof = proof;
  task.proofNotes = DOM.proofNotes().value.trim();

  // Auto-set status to in-progress if still pending
  if (task.status === 'pending') {
    task.status = 'in-progress';
  }

  saveProjectToDb(activeProject);

  showMsg(DOM.modalSuccess(), 'Proof submitted successfully!');

  setTimeout(() => {
    closeProofModal();
    renderTimeline(activeProject);
    updateDashboard(activeProject);
    renderProjectsList();
  }, 1200);
}

// ============================================
// 14. Utility Functions
// ============================================
function showMsg(el, text) {
  if (!el) return;
  el.textContent = text;
  el.style.display = 'block';
}

function clearMessages() {
  const errorEls = document.querySelectorAll('.pm-msg');
  errorEls.forEach((el) => {
    el.style.display = 'none';
    el.textContent = '';
  });
}

function setLoading(btn, isLoading, text = 'Loading...') {
  if (!btn) return;
  if (isLoading) {
    btn.dataset.originalHtml = btn.innerHTML;
    btn.innerHTML = `<span class="auth-spinner"></span> ${text}`;
    btn.disabled = true;
    btn.style.opacity = '0.72';
    btn.style.pointerEvents = 'none';
  } else {
    btn.innerHTML = btn.dataset.originalHtml || btn.innerHTML;
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.pointerEvents = '';
    if (window.lucide) lucide.createIcons();
  }
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function generateId() {
  return `proj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================
// 15. Back to Form (for creating new projects)
// ============================================
function showNewProjectForm() {
  activeProject = null;
  DOM.roadmapSection().style.display = 'none';
  DOM.dashboardSection().style.display = 'none';
  DOM.submitSection().style.display = 'block';
  DOM.projectsSection().style.display = 'block';
  renderProjectsList();

  DOM.submitSection().scrollIntoView({ behavior: 'smooth', block: 'start' });
}

window.showNewProjectForm = showNewProjectForm;
