export interface TodoItem {
    completed: boolean;
    priority: string | null;
    text: string;
    raw: string;
    projects: string[];
    contexts: string[];
    due: string | null;
}

export const parseTodo = (contents: string): TodoItem[] =>
    contents
        .split(/\r?\n/)
        .filter((line) => line.trim().length > 0)
        .map((raw) => {
            let text = raw;
            const completed = /^x\s+/i.test(text);
            if (completed) text = text.replace(/^x\s+/i, "");
            const priority = /^\([A-Z]\)\s+/.exec(text)?.[0]?.trim() ?? null;
            if (priority) text = text.slice(priority.length).trimStart();
            const projects = [...text.matchAll(/(?:^|\s)\+([^\s+@]+)/g)].map(
                (match) => match[1],
            );
            const contexts = [...text.matchAll(/(?:^|\s)@([^\s+@]+)/g)].map(
                (match) => match[1],
            );
            const due = /\bdue:(\d{4}-\d{2}-\d{2})\b/.exec(text)?.[1] ?? null;
            return {completed, priority, text, raw, projects, contexts, due};
        });

export const serializeTodo = (items: readonly TodoItem[]): string =>
    `${items.map((item) => item.raw).join("\n")}\n`;
