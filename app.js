/*
  app.js - UI and core logic
  - Waits for IndexedDB to be ready
  - Uses arrays (`tasks`), Map (`taskMap`), and stack (`undoStack`)
  - No inline handlers; all event listeners
*/

let tasks = [];                // Array of task objects
let taskMap = new Map();       // Hash map: id -> task
let undoStack = [];            // Stack for recent deletes

// DOM references
const form = document.getElementById('taskForm');
const titleInput = document.getElementById('title');
const priorityInput = document.getElementById('priority');
const deadlineInput = document.getElementById('deadline');
const taskList = document.getElementById('taskList');
const undoBtn = document.getElementById('undoBtn');
const messageBox = document.getElementById('message');

// Helper to show short messages
function showMessage(msg, type = 'info') {
  messageBox.textContent = msg;
  messageBox.className = `message ${type}`;
  console.log('[UI]', msg);
  setTimeout(() => { if (messageBox.textContent === msg) messageBox.textContent = ''; }, 3000);
}

// Create a task object
function createTask(title, priority, deadline) {
  return {
    id: Date.now() + Math.floor(Math.random() * 1000), // reduce collision risk
    title: title.trim(),
    priority,
    deadline
  };
}

// Render tasks list
function renderTasks() {
  taskList.innerHTML = '';

  if (tasks.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No tasks yet.';
    li.classList.add('placeholder');
    taskList.appendChild(li);
    return;
  }

  tasks.forEach(task => {
    const li = document.createElement('li');

    const left = document.createElement('div');
    left.className = 'task-left';
    left.innerHTML = `<strong>${escapeHtml(task.title)}</strong><br><small>${formatDateTime(task.deadline)}</small>`;

    const right = document.createElement('div');
    right.className = 'task-right';
    right.innerHTML = `<span class="badge ${task.priority.toLowerCase()}">${task.priority}</span>`;

    const delBtn = document.createElement('button');
    delBtn.className = 'btn small danger';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => handleDelete(task.id));

    right.appendChild(delBtn);
    li.appendChild(left);
    li.appendChild(right);

    taskList.appendChild(li);
  });
}

// Handle add task
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = titleInput.value;
  const priority = priorityInput.value;
  const deadline = deadlineInput.value;

  if (!title.trim()) {
    showMessage('Title is required', 'error');
    return;
  }
  if (!deadline) {
    showMessage('Deadline is required', 'error');
    return;
  }

  const newTask = createTask(title, priority, deadline);

  if (hasConflict(newTask, tasks)) {
    showMessage('Task conflict detected for the same deadline', 'error');
    return;
  }

  // Update memory structures
  tasks.push(newTask);
  taskMap.set(newTask.id, newTask);

  sortTasks(tasks);
  renderTasks();
  showMessage('Task added ✅', 'success');

  // Persist to DB (async, but UI already updated)
  try {
    await saveTaskToDB(newTask);
    console.log('[DB] saved', newTask);
  } catch (err) {
    console.error('[DB] save failed', err);
    showMessage('Failed to save task to DB', 'error');
  }

  form.reset();
});

// Handle delete
async function handleDelete(id) {
  const task = taskMap.get(id);
  if (!task) return;

  // Push to undo stack and update memory and DB
  undoStack.push(task); // stack push
  tasks = tasks.filter(t => t.id !== id);
  taskMap.delete(id);

  renderTasks();
  showMessage('Task deleted (click Undo to restore)', 'warning');

  try {
    await deleteTaskFromDB(id);
    console.log('[DB] deleted', id);
  } catch (err) {
    console.error('[DB] delete failed', err);
    showMessage('Failed to delete task from DB', 'error');
  }
}

// Handle undo
undoBtn.addEventListener('click', async () => {
  if (undoStack.length === 0) {
    showMessage('Nothing to undo', 'info');
    return;
  }

  const task = undoStack.pop(); // stack pop
  if (!task) return;

  if (hasConflict(task, tasks)) {
    showMessage('Cannot undo: conflicting deadline exists', 'error');
    // push it back on stack because undo wasn't performed
    undoStack.push(task);
    return;
  }

  tasks.push(task);
  taskMap.set(task.id, task);
  sortTasks(tasks);
  renderTasks();
  showMessage('Undo successful ✅', 'success');

  try {
    await saveTaskToDB(task);
    console.log('[DB] restored', task);
  } catch (err) {
    console.error('[DB] restore failed', err);
    showMessage('Failed to restore task to DB', 'error');
  }
});

// Initialize: wait for DB and load existing tasks
(async function init() {
  try {
    await dbReady; // provided by db.js
    const existing = await getAllTasksFromDB();
    tasks = existing || [];
    taskMap = new Map(tasks.map(t => [t.id, t]));
    sortTasks(tasks);
    renderTasks();
    console.log('[INIT] Loaded tasks:', tasks.length);
  } catch (err) {
    console.error('[INIT] DB init failed', err);
    showMessage('Failed to initialize DB', 'error');
  }
})();

// Small utility to escape HTML in titles
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[c]);
}

// format date/time for display
function formatDateTime(dt) {
  try {
    const d = new Date(dt);
    return d.toLocaleString();
  } catch (e) {
    return dt;
  }
}


