// Check for overlapping deadlines (exact same timestamp)
function hasConflict(newTask, tasks) {
  const newTs = new Date(newTask.deadline).getTime();
  return tasks.some(task => {
    const ts = new Date(task.deadline).getTime();
    return ts === newTs;
  });
}

// Priority-based sorting: High -> Medium -> Low, then by deadline
function sortTasks(tasks) {
  const priorityOrder = { High: 1, Medium: 2, Low: 3 };
  tasks.sort((a, b) => {
    const pa = priorityOrder[a.priority] || 99;
    const pb = priorityOrder[b.priority] || 99;
    if (pa !== pb) return pa - pb;
    return new Date(a.deadline) - new Date(b.deadline);
  });
}

// Expose utils (browser globals)
window.hasConflict = hasConflict;
window.sortTasks = sortTasks;
