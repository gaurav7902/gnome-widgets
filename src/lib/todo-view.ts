import type {TodoItem} from "./todotxt.js";

export interface TodoViewItem {
    text: string;
    completed: boolean;
    priority: string | null;
}

export const visibleTodos = (
    items: readonly TodoItem[],
    includeCompleted = false,
    limit = 8,
): TodoViewItem[] =>
    items
        .filter((item) => includeCompleted || !item.completed)
        .slice(0, Math.max(0, limit))
        .map(({text, completed, priority}) => ({text, completed, priority}));
